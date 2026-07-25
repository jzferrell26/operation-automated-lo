// prng-seed-util.cs — TEMPLATE (procedural-generation-weapon)
//
// A seed-threading PRNG utility so generators NEVER touch UnityEngine.Random (Hard Rule #9) and
// are pure functions of (seed, config). Provides:
//   - a seedable, deterministic stream (System.Random-backed; swap to Unity.Mathematics.Random
//     for a struct/no-GC/Burst-friendly variant — see the note at the bottom),
//   - deterministic sub-seed derivation so independent sub-steps (layout / loot / spawn) don't
//     bleed into each other's streams (guide 05 §"Seed threading").
//
// DEGRADED-research note: prefer Unity.Mathematics.Random for shipped generators; re-verify the
// cross-platform stream stability of whichever PRNG you pick before committing to it as canon.
//
// EditMode-safe: this is a plain class, no MonoBehaviour lifecycle. A generator owns one of these.

using System;

namespace Drift.Gameplay.ProcGen
{
    /// <summary>
    /// A deterministic, seedable pseudo-random stream. Owned by a generator; never global.
    /// Same seed -> same sequence, every run, every platform (System.Random stream).
    /// </summary>
    public sealed class DeterministicPrng
    {
        readonly System.Random _random;

        public int Seed { get; }

        public DeterministicPrng(int seed)
        {
            Seed = seed;
            _random = new System.Random(seed);
        }

        /// <summary>Inclusive-min, exclusive-max integer. Use integer selection for branch decisions.</summary>
        public int NextInt(int minInclusive, int maxExclusive)
        {
            if (maxExclusive <= minInclusive)
            {
                return minInclusive;
            }

            return _random.Next(minInclusive, maxExclusive);
        }

        /// <summary>[0,1) float. Avoid using float results for branch decisions that must match across platforms.</summary>
        public float NextFloat()
        {
            return (float)_random.NextDouble();
        }

        /// <summary>A point in the annulus [rMin, rMax) around a center — for Poisson-disc candidates (guide 04).</summary>
        public void NextAnnulus(float rMin, float rMax, out float dx, out float dz)
        {
            var angle = NextFloat() * (float)(2.0 * Math.PI);
            // sqrt for uniform area distribution within the annulus
            var radius = (float)Math.Sqrt(NextFloat() * (rMax * rMax - rMin * rMin) + rMin * rMin);
            dx = (float)Math.Cos(angle) * radius;
            dz = (float)Math.Sin(angle) * radius;
        }

        /// <summary>
        /// Derive an independent sub-stream from this stream's seed + a stable label.
        /// Use ONE sub-stream per sub-step (layout / loot / spawn) so they don't bleed (guide 05).
        /// </summary>
        public DeterministicPrng Derive(string label)
        {
            return new DeterministicPrng(SeedUtil.Combine(Seed, label));
        }
    }

    /// <summary>Stable, platform-independent seed mixing. No reliance on string.GetHashCode (not stable across runs).</summary>
    public static class SeedUtil
    {
        /// <summary>FNV-1a over the label, mixed with the base seed. Deterministic across runs/platforms.</summary>
        public static int Combine(int baseSeed, string label)
        {
            unchecked
            {
                const uint fnvOffset = 2166136261;
                const uint fnvPrime = 16777619;
                var hash = fnvOffset ^ (uint)baseSeed;
                hash *= fnvPrime;

                if (label != null)
                {
                    foreach (var c in label)
                    {
                        hash ^= c;
                        hash *= fnvPrime;
                    }
                }

                return (int)hash;
            }
        }
    }
}

// ---------------------------------------------------------------------------------------------
// Unity.Mathematics.Random variant (no-GC struct, Burst-friendly). Swap in when shipping:
//
//   using Unity.Mathematics;
//   var rng = new Unity.Mathematics.Random((uint)(seed == 0 ? 1 : seed)); // seed must be non-zero
//   int v = rng.NextInt(min, max);   // max exclusive
//   float f = rng.NextFloat();       // [0,1)
//
// Keep the SAME ownership + sub-seed-derivation discipline. Pick ONE PRNG per generator; never mix,
// never fall back to UnityEngine.Random (that is a must-fix — guide 05/09).
// ---------------------------------------------------------------------------------------------
