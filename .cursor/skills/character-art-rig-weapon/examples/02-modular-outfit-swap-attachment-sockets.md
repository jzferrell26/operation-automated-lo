# Example 02 — Modular Outfit Swap via Attachment Sockets

**Invocation:** "Let the player swap outfits / wear different gear."

A worked design for swapping a **cosmetic** outfit piece via a shared-skeleton `SkinnedMeshRenderer` plus a named attachment socket. DESIGN + EditMode-safe system. **Runs the cosmetic-only + GDD-flag protocol first** (`guides/05`).

---

## 0. Cosmetic-only / GDD flag (do this BEFORE anything — `guides/05`)

> "GDD §2 / Hard Rule #7 lock the protagonist **identity**. Outfit/look swapping is **cosmetic**, so it's compatible (cosmetic ≠ identity). But the GDD doesn't mention customization, so per Hard Rule #10 it should get a one-line note — e.g. *'The protagonist's identity is fixed; cosmetic customization (outfits, skins, attachments) is allowed and does not alter that identity.'* **That edit is yours to make in `space-survival-design-doc.md` — I won't touch the GDD.** This swap touches only mesh/material/attachments — no name, role, or second hero."

## 1. Sockets (placed by the human in the prefab — `guides/04`)

| Socket | Bone | Holds |
|---|---|---|
| `Socket_Head` | head | helmet (rigid) |
| `Socket_Back` | upper spine | backpack / O2 tank (rigid) |
| `Socket_HandR` | right hand | held tool/weapon (rigid) |

A `SocketRegistry` maps name → `Transform`.

## 2. Two swap kinds

- **Skinned torso outfit** — a `SkinnedMeshRenderer` rebound to the shared skeleton (`bones`/`rootBone` from the base body), authored against the same avatar (`guides/04`).
- **Rigid helmet** — a mesh parented to `Socket_Head` with a local offset.

## 3. The cosmetic swapper (EditMode-safe — `ARCHITECTURE.md` §7)

```csharp
// COSMETIC ONLY — identity is locked (GDD §2 / Hard Rule #7).
// Swaps mesh/material/attachments. NEVER modifies name/role/stats.
public class OutfitApplier : MonoBehaviour
{
    SocketRegistry _sockets;
    SkinnedMeshRenderer _bodyTarget;  // the swappable torso slot
    Transform[] _skeletonBones;
    Transform _rootBone;
    bool _initialized;

    void Awake() => EnsureInitialized();
    void EnsureInitialized() { if (_initialized) return; _initialized = true; }

    public void Configure(SocketRegistry sockets, SkinnedMeshRenderer bodyTarget,
                          Transform[] skeletonBones, Transform rootBone)
    {
        EnsureInitialized();
        _sockets = sockets; _bodyTarget = bodyTarget;
        _skeletonBones = skeletonBones; _rootBone = rootBone;
    }

    // Deterministic — a test can call this and assert the swap without Play mode.
    public void ApplySkinnedPiece(Mesh pieceMesh, Material pieceMaterial)
    {
        EnsureInitialized();
        if (_bodyTarget == null) return;
        _bodyTarget.sharedMesh = pieceMesh;            // cosmetic mesh swap
        _bodyTarget.sharedMaterial = pieceMaterial;    // cosmetic material swap
        _bodyTarget.bones = _skeletonBones;            // share the one skeleton
        _bodyTarget.rootBone = _rootBone;
    }

    public GameObject AttachRigid(GameObject prefab, string socketName)
    {
        EnsureInitialized();
        var socket = _sockets != null ? _sockets.Get(socketName) : null;
        if (socket == null || prefab == null) return null;
        var inst = Instantiate(prefab, socket);
        inst.transform.localPosition = Vector3.zero;
        inst.transform.localRotation = Quaternion.identity;
        return inst;
    }
}
```

## 4. Knob table

| Knob | Start | Range | Effect |
|---|---|---|---|
| `Socket_Head` local offset | (0,0,0) | small | helmet seat |
| `Socket_HandR` local rot | identity | — | grip alignment |

## 5. Handoff

"Author the outfit meshes against the shared skeleton; place sockets in-editor; tune offsets. Cosmetic-only by contract — and please add the one-line GDD §2 note (yours to make, not mine). The look is your call (§7)."

## Cross-Guardian
Skinned-mesh count / merge perf → `mobile-game-perf-guardian`; mesh import → `unity-art-pipeline-guardian`; equipment **stats** (if gear has any) → `character-progression-guardian` (looks here, numbers there).
