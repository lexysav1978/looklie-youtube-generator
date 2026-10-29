# Персонаж канала

Мальчик в очках, голубые глаза, светлые волосы с современной запоминающейся причёской, на одежде надпись LOOKLIE. Внешность «залипательная» для детей.

Референс: `character/looklie-boy.png` (Higgsfield job a6d116c6-7f8f-4326-86e7-c37ab05b1123 — можно передавать как reference image в генерацию видео). Запасной вариант: `character/variant-2.png`.

## Блок персонажа (вставлять в каждый промпт без изменений)

```
Same super cute toddler boy with big round clear light glasses, huge bright blue sparkling eyes, soft rosy cheeks, tiny freckles, light golden-blond hair in a modern memorable hairstyle (fluffy textured top with a playful upward swoosh quiff, short neat sides), warm biggest smile, tiny body, wearing a cozy sunny-yellow hoodie with the text "LOOKLIE" clearly visible on the chest, light blue rolled-up jeans, small white sneakers. Only him. Strictly same look. Very sticky adorable face that kids can't stop watching.
```

## Шаблон промпта видео (9:16, 720p, 10 секунд, английский)

```
Cute 3D Pixar-style toddler video, 10 seconds, bright colors, nursery style.

{БЛОК ПЕРСОНАЖА}

{Локация: 1 строка — место, свет, общий вид.}

He teaches {тема} with hard cuts, one {предмет} per shot:

0-2s: points to {предмет 1 с описанием}, says "{Слово1}!"
2-4s: points to {предмет 2}, says "{Слово2}!"
4-6s: points to {предмет 3}, says "{Слово3}!"
6-8s: points to {предмет 4}, says "{Слово4}!"
8-10s: smiles big, waves, says "{Общее слово}!"

One {предмет} per shot. Slow cute clear movements. Soft child voice. Light soft background music throughout: a gentle cheerful lullaby-style kids melody with ukulele, soft xylophone and glockenspiel, quiet and calm, always lower than his voice. No text on screen (except "LOOKLIE" on his clothes). Very simple and toddler-safe.
```

## Пример (здания)

```
Cute 3D Pixar-style toddler video, 10 seconds, bright colors, nursery style.

Same super cute toddler boy with big round clear light glasses, huge bright blue sparkling eyes, soft rosy cheeks, tiny freckles, light golden-blond hair in a modern memorable hairstyle (fluffy textured top with a playful upward swoosh quiff, short neat sides), warm biggest smile, tiny body, wearing a cozy sunny-yellow hoodie with the text "LOOKLIE" clearly visible on the chest, light blue rolled-up jeans, small white sneakers. Only him. Strictly same look. Very sticky adorable face that kids can't stop watching.

Bright colorful kids city, soft sunlight, big cute friendly 3D buildings.

He teaches building names with hard cuts, one building per shot:

0-2s: points to a cozy little house with a red roof, says "House!"
2-4s: points to a bright colorful shop with big windows, says "Shop!"
4-6s: points to a cute library with books in the windows, says "Library!"
6-8s: points to a round museum with big columns, says "Museum!"
8-10s: smiles big, waves, says "Buildings!"

One building per shot. Slow cute clear movements. Soft child voice. Light soft background music throughout: a gentle cheerful lullaby-style kids melody with ukulele, soft xylophone and glockenspiel, quiet and calm, always lower than his voice. No text on screen (except "LOOKLIE" on his clothes). Very simple and toddler-safe.
```

## Паспорт героя (референс для других моделей)
Файл `character/passport.png` (2688×1512, gpt_image_2_5, 2k): сверху 4 ракурса в полный рост (спереди, 3/4, профиль, сзади), снизу 6 эмоций (радость, смех, удивление, любопытство, застенчивая улыбка, зевок). Передаётся как референс-картинка в моделях, которые её принимают (в Grok Lite референса нет — там образ задаётся только текстовым блоком персонажа).
Higgsfield job: a4dd3a0f-53e8-46fb-929f-2059872651f7.
