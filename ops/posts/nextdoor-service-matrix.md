# Nextdoor Service Matrix (Canonical)

Updated: 2026-03-06
Policy: publish only with 1:1 service-photo match. If no matched photo, status = ON_HOLD_NO_MATCHED_PHOTO.

| service_id | service_label | approved_image_filename | campaign_utm | status |
|---|---|---|---|---|
| tv_mounting | TV Mounting | Handyman mounting a large flat-screen TV.png | nd_service_tv_mounting | PUBLISHED |
| furniture_assembly | Furniture Assembly | Handyman assembling a white bookshelf.png | nd_service_furniture_assembly | PUBLISHED |
| interior_painting | Interior Painting | Kitchen renovation before and after.png | nd_service_interior_painting | PUBLISHED |
| flooring | Flooring (LVP/Laminate) | Handyman installing LVP flooring in bright room.png | nd_service_flooring | PUBLISHED |
| kitchen_cabinet_painting | Kitchen Cabinet Painting | Painter at work spraying cabinet doors.png | nd_service_cabinet_painting | PUBLISHED |
| furniture_painting | Furniture Painting | Freshly painted white shaker cabinets.png | nd_service_furniture_painting | PUBLISHED |
| art_mirrors_hanging | Art & Mirrors Hanging | — | nd_service_art_mirrors | ON_HOLD_NO_MATCHED_PHOTO |
| minor_plumbing | Minor Plumbing | — | nd_service_minor_plumbing | ON_HOLD_NO_MATCHED_PHOTO |
| minor_electrical | Minor Electrical | — | nd_service_minor_electrical | ON_HOLD_NO_MATCHED_PHOTO |

## Guardrails
- No substitutes for ON_HOLD services.
- No `Licensed` claim in profile/posts.
- Keep UTM format: `utm_source=nextdoor&utm_medium=organic&utm_campaign=nd_service_<service_key>`.
