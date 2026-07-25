// Template: EditMode-safe MonoBehaviour for PROJECT-DRIFT.
//
// Encodes the three patterns from ARCHITECTURE.md §7 / CLAUDE.md Hard Rule #11, because
// Unity does NOT run Awake/Start/Update on script-added components in EditMode:
//   1. Lazy init      — EnsureInitialized() guard, called from Awake AND every entry point.
//   2. Configure(...)  — explicit dependency injection (works in code, editor, and tests).
//   3. Extracted Tick  — public Tick(float deltaSeconds); Update only forwards Time.deltaTime.
//
// Plus: [SerializeField] private tunables (guide 05), symmetric event subscribe/unsubscribe
// (guide 06). Place under Assets/Scripts/Drift/<Layer>/<Area>/ with a matching namespace
// (guide 03). Replace the placeholders and delete what you don't need.

using UnityEngine;
// using Drift.Core.Combat;   // e.g. if you depend on Health

namespace Drift.Core.Example   // <-- match the folder: Drift.<Layer>.<Area>
{
    public class ExampleSystem : MonoBehaviour
    {
        // --- Inspector tunables: serialize-private, never public (guide 05). ---
        [Header("Tuning")]
        [SerializeField] float ratePerSecond = 1f;
        [SerializeField] bool enabledByDefault = true;

        // --- Internal state + injected deps. ---
        // SomeDependency _dep;            // injected via Configure
        bool _enabled;
        bool _initialized;

        // --- Read-only windows for external code (no public mutable fields). ---
        public bool IsEnabled { get { EnsureInitialized(); return _enabled; } }

        // ---------- Pattern 1: lazy init ----------
        void Awake() => EnsureInitialized();

        void EnsureInitialized()
        {
            if (_initialized) return;

            _enabled = enabledByDefault;
            // _someEvent += OnSomething;   // subscribe here; unsubscribe in OnDestroy
            _initialized = true;
        }

        void OnDestroy()
        {
            // _someEvent -= OnSomething;    // symmetric unsubscribe, null-guarded (guide 06)
        }

        // ---------- Pattern 2: explicit Configure(...) ----------
        // Inject cross-object dependencies so the spawner, editor, and EditMode tests can wire
        // this up without relying on Start / FindObjectOfType.
        public void Configure(/* SomeDependency dep */)
        {
            EnsureInitialized();          // always init first
            // _dep = dep;
        }

        // ---------- Pattern 3: extracted Tick ----------
        void Update() => Tick(Time.deltaTime);   // forwarder ONLY — no logic here

        public void Tick(float deltaSeconds)     // tests drive this directly
        {
            EnsureInitialized();
            if (deltaSeconds <= 0f) return;      // guard non-positive dt (matches the spine)
            if (!_enabled) return;

            // ... per-frame logic, using deltaSeconds (never Time.deltaTime here).
        }

        // ---------- Intentional setters instead of public fields ----------
        public void SetEnabled(bool value)
        {
            EnsureInitialized();
            _enabled = value;
        }
    }
}
