// Генератор идей: собирает сценарии по шаблону из банка тем. Работает прямо в браузере.
(function () {
  const SMILE = 'smiles big, waves';

  // Учим слова: 4 предмета + финал. [название, смайлик, место, предмет (англ.), [[действие, слово] x4], финальное слово]
  const TEACH = [
    ['Учим цифры', '🔢', 'Bright colorful toy classroom, soft sunlight, big soft 3D number blocks.', 'number',
      [['points to a big red block with the number 1', 'One!'], ['points to a big blue block with the number 2', 'Two!'], ['points to a big yellow block with the number 3', 'Three!'], ['points to a big green block with the number 4', 'Four!']], 'Numbers!'],
    ['Учим фигуры', '🔺', 'Bright colorful kids playroom, soft sunlight, giant soft 3D shapes.', 'shape',
      [['points to a big red circle', 'Circle!'], ['points to a big blue square', 'Square!'], ['points to a big yellow triangle', 'Triangle!'], ['points to a big shiny star', 'Star!']], 'Shapes!'],
    ['Части тела', '🙋', 'Bright colorful kids room, soft sunlight, soft pastel walls.', 'body part',
      [['touches his little nose', 'Nose!'], ['points to his big sparkling eyes', 'Eyes!'], ['wiggles his tiny hands', 'Hands!'], ['wiggles his tiny feet', 'Feet!']], 'Body!'],
    ['Домашние питомцы', '🐶', 'Bright colorful cozy toy home, soft sunlight, big cute friendly 3D pets.', 'pet',
      [['points to a fluffy puppy', 'Dog!'], ['points to a soft orange kitten', 'Cat!'], ['points to a cute white bunny', 'Bunny!'], ['points to a tiny golden fish in a bowl', 'Fish!']], 'Pets!'],
    ['Морские жители', '🐠', 'Bright colorful toy ocean, soft sunlight through the water, big cute friendly 3D sea animals.', 'sea animal',
      [['points to a happy orange fish', 'Fish!'], ['points to a gentle green turtle', 'Turtle!'], ['points to a big friendly blue whale', 'Whale!'], ['points to a little red crab', 'Crab!']], 'Sea!'],
    ['Звери в зоопарке', '🦁', 'Bright colorful toy zoo, soft sunlight, big cute friendly 3D animals.', 'animal',
      [['points to a fluffy golden lion', 'Lion!'], ['points to a playful little monkey', 'Monkey!'], ['points to a big gentle elephant', 'Elephant!'], ['points to a tall spotted giraffe', 'Giraffe!']], 'Zoo!'],
    ['Овощи на грядке', '🥕', 'Bright colorful toy vegetable garden, soft sunlight, big cute friendly 3D vegetables.', 'vegetable',
      [['holds up a crunchy orange carrot', 'Carrot!'], ['holds up a round red tomato', 'Tomato!'], ['holds up a long green cucumber', 'Cucumber!'], ['holds up a sweet yellow corn', 'Corn!']], 'Vegetables!'],
    ['Игрушки', '🧸', 'Bright colorful toy room, soft sunlight, big cute friendly 3D toys.', 'toy',
      [['hugs a soft brown teddy bear', 'Teddy!'], ['bounces a big red ball', 'Ball!'], ['points to a little shiny robot', 'Robot!'], ['stacks colorful building blocks', 'Blocks!']], 'Toys!'],
    ['Одежда', '🧢', 'Bright colorful toy wardrobe room, soft sunlight, big cute 3D clothes on hangers.', 'clothes item',
      [['puts on a funny striped hat', 'Hat!'], ['holds up a pair of fluffy socks', 'Socks!'], ['points to a pair of little rain boots', 'Boots!'], ['points to a warm blue jacket', 'Jacket!']], 'Clothes!'],
    ['Музыкальные инструменты', '🥁', 'Bright colorful kids music room, soft sunlight, big cute friendly 3D instruments.', 'instrument',
      [['taps a little drum', 'Drum!'], ['strums a tiny guitar', 'Guitar!'], ['presses the keys of a toy piano', 'Piano!'], ['shakes a shiny golden tambourine', 'Tambourine!']], 'Music!'],
    ['Насекомые в саду', '🐞', 'Bright colorful toy flower garden, soft sunlight, big cute friendly 3D bugs.', 'bug',
      [['points to a buzzing striped bee', 'Bee!'], ['points to a red ladybug with black dots', 'Ladybug!'], ['points to a colorful butterfly', 'Butterfly!'], ['points to a slow little snail', 'Snail!']], 'Garden!'],
    ['Космос', '🚀', 'Bright colorful kids space, soft glowing light, big cute friendly 3D planets and stars.', 'space thing',
      [['points to a glowing round moon', 'Moon!'], ['points to a twinkling golden star', 'Star!'], ['points to a little red rocket', 'Rocket!'], ['points to a big ringed planet', 'Planet!']], 'Space!'],
    ['Времена года', '🍂', 'Bright colorful storybook park, soft sunlight, big cute friendly 3D trees.', 'season',
      [['points to a tree full of pink flowers', 'Spring!'], ['points to a bright smiling sun and a sandcastle', 'Summer!'], ['points to a tree with orange falling leaves', 'Autumn!'], ['points to a snowman in soft snow', 'Winter!']], 'Seasons!'],
    ['Детская площадка', '🛝', 'Bright colorful kids playground, soft sunlight, big cute friendly 3D equipment.', 'playground item',
      [['points to a shiny red slide', 'Slide!'], ['points to a swing with a smiley seat', 'Swing!'], ['points to a sandbox with a tiny bucket', 'Sandbox!'], ['points to a yellow seesaw', 'Seesaw!']], 'Playground!'],
    ['Профессии', '🧑‍🚒', 'Bright colorful toy town, soft sunlight, big cute friendly 3D helpers.', 'job',
      [['points to a friendly doctor with a stethoscope', 'Doctor!'], ['points to a brave firefighter with a red helmet', 'Firefighter!'], ['points to a happy chef with a tall white hat', 'Chef!'], ['points to a smiling pilot with a little cap', 'Pilot!']], 'Jobs!']
  ];

  // Истории: 5 готовых шагов. [название, смайлик, место, вступление, правило, [[действие, слово] x5], доп. героев?]
  const STORY = [
    ['Мальчик собирает грибы', '🍄', 'Sunny storybook forest, soft golden light, big cute friendly 3D trees and mushrooms.', 'He goes mushroom picking with hard cuts, one step per shot:', 'One step per shot.',
      [['walks into a cozy forest holding a little wicker basket', 'Forest!'], ['finds a red mushroom with white dots and points to it', 'Look!'], ['carefully picks a mushroom and puts it in the basket', 'Pick!'], ['shows a basket full of colorful mushrooms', 'So many!'], [SMILE, 'Yummy!']]],
    ['Мальчик едет на поезде', '🚂', 'Bright colorful toy railway, soft sunlight, rolling green hills, big cute friendly 3D train.', 'He rides a train with hard cuts, one step per shot:', 'One step per shot.',
      [['waves to a cute colorful train at the station', 'Choo-choo!'], ['climbs aboard and sits by the window', 'All aboard!'], ['looks out at hills and cows passing by', 'Wow!'], ['points to a big rainbow outside', 'Rainbow!'], ['waves from the train window', 'Bye-bye!']]],
    ['Мальчик знакомится с девочкой', '👧', 'Bright colorful sunny park with flowers, soft sunlight, big cute friendly 3D trees.', 'He meets a new friend with hard cuts, one step per shot:', 'One step per shot.',
      [['walks in the park and sees a cute little girl with pigtails', 'Hello!'], ['waves to her with a shy smile', 'Hi!'], ['gives her a pretty flower while she smiles', 'Flower!'], ['holds hands with her and they giggle together', 'Friends!'], ['waves to the camera together with her', 'Bye-bye!']], 'a cute little girl with pigtails appears with him'],
    ['День рождения', '🎂', 'Bright colorful kids party room, soft sunlight, floating 3D balloons and confetti.', 'He celebrates a birthday with hard cuts, one step per shot:', 'One step per shot.',
      [['walks into a party room full of balloons', 'Party!'], ['points to a big cake with candles', 'Cake!'], ['takes a deep breath with puffed cheeks', 'Blow!'], ['blows out the candles while confetti falls', 'Hooray!'], [SMILE, 'Happy birthday!']]],
    ['Чистим зубы', '🪄', 'Bright colorful kids bathroom, soft sunlight, shiny pastel tiles, big cute friendly 3D tools.', 'He brushes his teeth with hard cuts, one step per shot:', 'One step per shot.',
      [['holds up a little toothbrush', 'Brush!'], ['puts a tiny bit of toothpaste on it', 'Paste!'], ['brushes his teeth in slow circles', 'Brush, brush!'], ['rinses with a little cup', 'Rinse!'], ['shows a big shiny clean smile', 'Clean!']]],
    ['Сажаем цветок', '🌻', 'Bright colorful toy garden, soft sunlight, big cute friendly 3D flowers.', 'He plants a flower with hard cuts, one step per shot:', 'One step per shot.',
      [['digs a small hole with a tiny shovel', 'Dig!'], ['puts a little seed into the hole', 'Seed!'], ['waters it with a small watering can', 'Water!'], ['watches a big sunflower grow up', 'Grow!'], ['hugs the sunflower and waves', 'Flower!']]],
    ['Прыгаем по лужам', '🌧️', 'Bright colorful toy street after rain, soft sunlight, big cute friendly 3D puddles and a rainbow.', 'He plays in the rain with hard cuts, one step per shot:', 'One step per shot.',
      [['puts on bright yellow rain boots', 'Boots!'], ['holds a big colorful umbrella', 'Umbrella!'], ['jumps into a puddle with a big splash', 'Splash!'], ['jumps again and giggles', 'Again!'], [SMILE, 'Rain!']]],
    ['Купаемся с уточкой', '🛁', 'Bright colorful kids bathroom, soft sunlight, big friendly 3D bubbles.', 'He takes a bubble bath with hard cuts, one step per shot:', 'One step per shot.',
      [['sits in a bubble bath with a little yellow rubber duck', 'Bath!'], ['blows soft shiny bubbles', 'Bubbles!'], ['gently washes the rubber duck', 'Duck!'], ['wraps himself in a fluffy towel', 'Towel!'], [SMILE, 'Clean!']]]
  ];

  function bank() {
    const out = [];
    TEACH.forEach(([title, emoji, location, noun, items, outro]) => {
      out.push({
        id: 'teach-' + hashId(title), title, emoji, status: 'proposed', location,
        intro: `He teaches ${noun} names with hard cuts, one ${noun} per shot:`, rule: `One ${noun} per shot.`,
        shots: items.map(([action, say]) => ({ action, say })).concat([{ action: SMILE, say: outro }])
      });
    });
    STORY.forEach(([title, emoji, location, intro, rule, shots, others]) => {
      const s = { id: 'story-' + hashId(title), title, emoji, status: 'proposed', location, intro, rule, shots: shots.map(([action, say]) => ({ action, say })) };
      if (others) s.others = others;
      out.push(s);
    });
    return out;
  }
  function hashId(t) { let h = 7; for (const c of t) h = (h * 33 + c.charCodeAt(0)) >>> 0; return h.toString(36); }
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  // Возвращает до n новых идей, которых ещё нет среди usedIds
  window.generateIdeas = function (n, usedIds) {
    const used = new Set(usedIds);
    return shuffle(bank().filter((s) => !used.has(s.id))).slice(0, n);
  };
  window.IDEA_BANK_SIZE = TEACH.length + STORY.length;
})();
