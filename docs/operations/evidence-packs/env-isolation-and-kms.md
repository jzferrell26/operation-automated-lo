# Evidence pack: Environment isolation and KMS

Wave 2. Unblocks `001J-AC-026` and `001J-AC-029`.

## Need from user

- [ ] Cloud owner for preview, staging, and dark production inventories
- [ ] Per-environment KMS key custody

## Checklist

| Case | Done | Evidence retained (sanitized) |
| --- | --- | --- |
| Inventory DB, tasks, secrets, storage, Stripe mode, provider app IDs for all three environments | [ ] | |
| Pairwise isolation proved; cross-environment access denied | [ ] | |
| Rotate current token envelope | [ ] | |
| Restore with intended environment key | [ ] | |
| Cross-environment decryption denied | [ ] | |

Related templates: [environment-inventory.template.md](../environment-inventory.template.md), [cloud-environment-setup.md](../cloud-environment-setup.md).

Production traffic remains disabled after this wave.
