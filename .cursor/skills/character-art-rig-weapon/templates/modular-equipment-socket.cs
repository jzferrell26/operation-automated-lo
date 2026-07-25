// Template — Modular Equipment Socket (attach point) system for PROJECT-DRIFT.
//
// EditMode-safe per ARCHITECTURE.md §7 (CLAUDE.md Hard Rule #11):
//   - lazy-init guarded by a flag (Unity does NOT run Awake on script-added
//     components in EditMode),
//   - explicit Configure(...) for dependency injection,
//   - deterministic Attach/Detach methods (no logic-only-in-Update) so a test
//     can attach a piece and assert the resulting child Transform without Play mode.
//
// SCOPE: this is the MECHANISM (guides/04). The cosmetic POLICY (cosmetic-only,
// GDD §2, the GDD-note flag) is in guides/05 and governs what may be attached.
//
// This is a DESIGN template. Tier 0 characters are gray-box capsules; do not wire
// real art into the gray-box ahead of the "is it fun?" call (Hard Rule #1).

using System.Collections.Generic;
using UnityEngine;

namespace Drift.Gameplay.Characters
{
    /// <summary>
    /// Maps named attachment sockets (empty child Transforms on bones) to their
    /// Transforms, and attaches/detaches rigid props (helmet, backpack, held tool)
    /// by socket name. Skinned modular pieces use the shared-skeleton path instead
    /// (see OutfitSwapSystem / guides/04).
    /// </summary>
    public class ModularEquipmentSocket : MonoBehaviour
    {
        [System.Serializable]
        public struct SocketBinding
        {
            public string socketName;   // e.g. "Socket_Head", "Socket_HandR"
            public Transform socket;    // empty child Transform on the bone
        }

        [SerializeField] List<SocketBinding> sockets = new();

        readonly Dictionary<string, Transform> _byName = new();
        readonly Dictionary<string, GameObject> _attached = new();
        bool _initialized;

        void Awake() => EnsureInitialized();

        void EnsureInitialized()
        {
            if (_initialized) return;
            _byName.Clear();
            foreach (var b in sockets)
            {
                if (!string.IsNullOrEmpty(b.socketName) && b.socket != null)
                {
                    _byName[b.socketName] = b.socket;
                }
            }
            _initialized = true;
        }

        /// <summary>
        /// Injects socket bindings explicitly so the runtime spawner and EditMode
        /// tests can wire sockets without relying on the serialized list or Start.
        /// </summary>
        public void Configure(IEnumerable<SocketBinding> bindings)
        {
            EnsureInitialized();
            _byName.Clear();
            foreach (var b in bindings)
            {
                if (!string.IsNullOrEmpty(b.socketName) && b.socket != null)
                {
                    _byName[b.socketName] = b.socket;
                }
            }
        }

        public Transform Get(string socketName)
        {
            EnsureInitialized();
            return _byName.TryGetValue(socketName, out var t) ? t : null;
        }

        /// <summary>
        /// Attaches a rigid prop to a named socket. Deterministic: callable from a
        /// test which then asserts the prop is a child of the socket. Replaces any
        /// existing attachment on that socket. COSMETIC use only (guides/05).
        /// </summary>
        public GameObject Attach(GameObject prefab, string socketName)
        {
            EnsureInitialized();
            var socket = Get(socketName);
            if (socket == null || prefab == null) return null;

            Detach(socketName);

            var inst = Instantiate(prefab, socket);
            inst.transform.localPosition = Vector3.zero;
            inst.transform.localRotation = Quaternion.identity;
            _attached[socketName] = inst;
            return inst;
        }

        /// <summary>Removes the attachment on a socket, if any. Deterministic.</summary>
        public void Detach(string socketName)
        {
            EnsureInitialized();
            if (_attached.TryGetValue(socketName, out var existing) && existing != null)
            {
                DestroyAttachment(existing);
                _attached.Remove(socketName);
            }
        }

        // Play-mode-aware destroy: Object.Destroy is illegal in EditMode tests,
        // so fall back to DestroyImmediate when not playing (ARCHITECTURE.md §7).
        static void DestroyAttachment(GameObject go)
        {
            if (Application.isPlaying) Destroy(go);
            else DestroyImmediate(go);
        }
    }
}
