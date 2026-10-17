# Explorer prototype provenance

Verified 2026-10-14.

- Base: Rogue.glb, KayKit Adventurers Character Pack 1.0, Kay Lousberg (https://kaylousberg.com).
- Official repository: https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0
- Pinned revision: 672074b73ba276876a19e8816ecdc5241817ab47.
- Original model: addons/kaykit_character_pack_adventures/Characters/gltf/Rogue.glb
- Download: https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0/672074b73ba276876a19e8816ecdc5241817ab47/addons/kaykit_character_pack_adventures/Characters/gltf/Rogue.glb
- Original SHA-256: e825437cd4d2ee9c1960b517a74a69101e33eb409ae7fa8cedc7134a998fbb7d.
- License evidence: https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0/672074b73ba276876a19e8816ecdc5241817ab47/LICENSE.txt
- Exact author-supplied license retained in KayKit-LICENSE.txt: Creative Commons Zero (CC0), with explicit permission for personal, educational and commercial projects; attribution optional. Canonical dedication: https://creativecommons.org/publicdomain/zero/1.0/

## Local preparation

Only the free public-repository Rogue is used; no EXTRA/SOURCE paid content, branding, other packs or animation services. The embedded palette texture and Idle clip are covered by the same pack license.

Scripts/prepare-companion.mjs verifies the original SHA-256, removes weapon/cape meshes, retains only Idle, adds a simple original geometric canvas backpack, pocket, bedroll and shoulder straps, and compacts unused meshes/accessors/binary views. The generated geometry uses only BoxGeometry and no third-party art. It is a prototype adaptation, not a claim that the original creator supplied an explorer/backpack or endorses Journey Creator.

Result explorer.glb: 290,876 bytes; 4,323 triangles; 41 joints; 3 materials; one embedded 1024x1024 PNG; one Idle clip; no external resource URIs or decoder extensions. SHA-256: 2ad8ccb870a7c227604d1582e52b16e797b7bd07a4d713ef659a54502ffb96f7.

explorer-texture.png is an exact extraction of the GLB's embedded palette, bundled separately to avoid the Fiber native Blob adapter creating a fresh temporary PNG on each mount. The GLB remains self-contained.

Reproduce after obtaining the pinned original (not automatically downloaded):

    node scripts/prepare-companion.mjs /path/to/Rogue.glb /absolute/path/to/assets/companion/explorer.glb

Native Android appearance, idle playback, transparency and performance are pending physical-device verification.
