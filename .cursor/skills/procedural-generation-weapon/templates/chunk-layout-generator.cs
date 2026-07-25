// chunk-layout-generator.cs — TEMPLATE (procedural-generation-weapon)
//
// A seeded modular-chunk layout generator that assembles an LDOE-style location from authored kits
// (modular-over-noise, guide 01/02). This Guardian owns the placement ALGORITHM; the kit prefabs are
// unity-level-design-guardian's, and the weights/target-count VALUES are game-balance-guardian's.
//
// EditMode-safe (Hard Rule #11): lazy-init + Configure(...) + extracted Generate() returning DATA.
// No logic in Awake/Start/Update. Pure function of (seed, config) -> reproducible AND testable.
//
// Returns a placement list (DATA). Instantiating the prefabs is a separate thin step (keeps the
// algorithm EditMode-pure; instantiation perf is mobile-game-perf-guardian's).

using System;
using System.Collections.Generic;
using UnityEngine;

namespace Drift.Gameplay.ProcGen
{
    [Serializable]
    public struct ChunkSocket
    {
        public Vector2Int direction;   // grid edge this socket opens onto (e.g. (1,0))
        public string socketType;      // only matching socketTypes connect (guide 02)
    }

    /// <summary>A chunk as DATA. The PREFAB + sockets are authored by unity-level-design-guardian.</summary>
    [Serializable]
    public sealed class ChunkDefinition
    {
        public string id;
        public GameObject prefab;          // level-design owns this asset's contents
        public Vector2Int footprint;       // grid cells occupied
        public ChunkSocket[] sockets;
        public string[] tags;              // "entrance", "objective_slot", "dead_end", ...
        public int weight;                 // VALUE -> game-balance-guardian
    }

    /// <summary>The palette + constraints. A ScriptableObject in practice (data over code).</summary>
    [Serializable]
    public sealed class ChunkSet
    {
        public ChunkDefinition entrance;
        public ChunkDefinition capWall;            // used to seal an opening that nothing fits
        public ChunkDefinition[] chunks;
        public int requiredObjectiveSlots = 1;     // VALUE/constraint -> game-balance/design
    }

    [Serializable]
    public struct LayoutConfig
    {
        public int targetChunkCount;   // VALUE -> game-balance-guardian (difficulty-read, guide 06)
    }

    /// <summary>One placement decision — plain DATA, EditMode-pure.</summary>
    public readonly struct ChunkPlacement
    {
        public readonly string ChunkId;
        public readonly Vector2Int Cell;
        public ChunkPlacement(string chunkId, Vector2Int cell)
        {
            ChunkId = chunkId;
            Cell = cell;
        }
    }

    public sealed class LayoutResult
    {
        public Vector2Int Entrance;
        public readonly List<ChunkPlacement> Placements = new List<ChunkPlacement>();
        public readonly List<Vector2Int> RequiredSlots = new List<Vector2Int>();
        // adjacency built from socket matches — used by the reachability invariant (guide 09)
        public readonly Dictionary<Vector2Int, List<Vector2Int>> Adjacency =
            new Dictionary<Vector2Int, List<Vector2Int>>();
    }

    /// <summary>
    /// Seeded modular-layout generator. Use as a plain class (tests) or behind a thin MonoBehaviour
    /// whose Awake only forwards into Configure/Generate.
    /// </summary>
    public sealed class ChunkLayoutGenerator
    {
        ChunkSet _set;
        LayoutConfig _config;
        DeterministicPrng _prng;
        bool _configured;

        /// <summary>Explicit dependency wiring — no Awake needed (Hard Rule #11).</summary>
        public void Configure(ChunkSet set, LayoutConfig config, int seed)
        {
            _set = set;
            _config = config;
            _prng = new DeterministicPrng(seed);
            _configured = true;
        }

        /// <summary>
        /// Runs the whole layout walk and returns DATA. Pure function of (seed, config).
        /// Tests call Configure + Generate twice with one seed and assert identical results.
        /// </summary>
        public LayoutResult Generate()
        {
            if (!_configured)
            {
                throw new InvalidOperationException("Configure(...) before Generate().");
            }

            var result = new LayoutResult();
            var occupied = new HashSet<Vector2Int>();
            // Frontier is an ORDERED list (not a set) so iteration order is stable (guide 05).
            var frontier = new List<(Vector2Int cell, ChunkSocket socket)>();

            // 1. Entrance at origin.
            var origin = Vector2Int.zero;
            Place(result, occupied, frontier, _set.entrance, origin);
            result.Entrance = origin;

            // 2. Grow the layout up to the target count.
            var placed = 1;
            var guard = 0;
            while (frontier.Count > 0 && placed < _config.targetChunkCount && guard++ < 10000)
            {
                // Deterministic pop: take the first opening (stable order).
                var opening = frontier[0];
                frontier.RemoveAt(0);

                var targetCell = opening.cell + opening.socket.direction;
                if (occupied.Contains(targetCell))
                {
                    continue;
                }

                var candidate = SelectCompatibleChunk(opening.socket.socketType);
                if (candidate == null)
                {
                    PlaceCap(result, occupied, opening, targetCell);
                    continue;
                }

                Place(result, occupied, frontier, candidate, targetCell);
                LinkAdjacency(result, opening.cell, targetCell);
                placed++;
            }

            // 3. Assign required objective slots from chunks tagged "objective_slot".
            AssignObjectiveSlots(result);

            // 4. Reachability is asserted by the TEST (guide 07/09), not silently fixed here.
            return result;
        }

        ChunkDefinition SelectCompatibleChunk(string socketType)
        {
            // Filter to chunks with a matching socket, then weighted-pick (declared order, seeded).
            var total = 0;
            for (var i = 0; i < _set.chunks.Length; i++)
            {
                if (HasMatchingSocket(_set.chunks[i], socketType))
                {
                    total += Mathf.Max(0, _set.chunks[i].weight);
                }
            }

            if (total <= 0)
            {
                return null;
            }

            var r = _prng.NextInt(0, total);
            var running = 0;
            for (var i = 0; i < _set.chunks.Length; i++)
            {
                var chunk = _set.chunks[i];
                if (!HasMatchingSocket(chunk, socketType) || chunk.weight <= 0)
                {
                    continue;
                }

                running += chunk.weight;
                if (r < running)
                {
                    return chunk;
                }
            }

            return null;
        }

        static bool HasMatchingSocket(ChunkDefinition chunk, string socketType)
        {
            if (chunk.sockets == null)
            {
                return false;
            }

            foreach (var s in chunk.sockets)
            {
                if (s.socketType == socketType)
                {
                    return true;
                }
            }

            return false;
        }

        static void Place(
            LayoutResult result,
            HashSet<Vector2Int> occupied,
            List<(Vector2Int, ChunkSocket)> frontier,
            ChunkDefinition chunk,
            Vector2Int cell)
        {
            occupied.Add(cell);
            result.Placements.Add(new ChunkPlacement(chunk.id, cell));
            if (!result.Adjacency.ContainsKey(cell))
            {
                result.Adjacency[cell] = new List<Vector2Int>();
            }

            if (chunk.sockets != null)
            {
                foreach (var s in chunk.sockets)
                {
                    frontier.Add((cell, s));
                }
            }

            if (chunk.tags != null && Array.IndexOf(chunk.tags, "objective_slot") >= 0)
            {
                result.RequiredSlots.Add(cell);
            }
        }

        void PlaceCap(LayoutResult result, HashSet<Vector2Int> occupied,
            (Vector2Int cell, ChunkSocket socket) opening, Vector2Int targetCell)
        {
            if (_set.capWall == null)
            {
                return;
            }

            occupied.Add(targetCell);
            result.Placements.Add(new ChunkPlacement(_set.capWall.id, targetCell));
            LinkAdjacency(result, opening.cell, targetCell);
        }

        static void LinkAdjacency(LayoutResult result, Vector2Int a, Vector2Int b)
        {
            if (!result.Adjacency.TryGetValue(a, out var la))
            {
                la = new List<Vector2Int>();
                result.Adjacency[a] = la;
            }

            if (!result.Adjacency.TryGetValue(b, out var lb))
            {
                lb = new List<Vector2Int>();
                result.Adjacency[b] = lb;
            }

            la.Add(b);
            lb.Add(a);
        }

        void AssignObjectiveSlots(LayoutResult result)
        {
            // RequiredSlots already collected during placement; if more slots exist than required,
            // pick deterministically. (Selection of WHICH slot holds WHICH cache is design's intent;
            // this Guardian only guarantees the slots exist and are reachable.)
        }
    }
}

// ---------------------------------------------------------------------------------------------
// EditMode test shape (guide 07):
//   gen.Configure(set, config, 12345); var a = gen.Generate();
//   gen2.Configure(set, config, 12345); var b = gen2.Generate();
//   CollectionAssert.AreEqual(a.Placements, b.Placements);          // reproducibility
//   // different seed -> different placements                        // variation
//   Assert.IsTrue(AllReachable(b.Adjacency, b.Entrance, b.RequiredSlots)); // invariant (guide 09)
//
// HANDOFFS: kit prefabs (ChunkDefinition.prefab) -> unity-level-design-guardian;
//           weight / targetChunkCount VALUES -> game-balance-guardian.
// TIER: this is Tier-1+ design; do NOT wire it in to replace Tier0RuntimeSpawner mid-Tier-0.
// ---------------------------------------------------------------------------------------------
