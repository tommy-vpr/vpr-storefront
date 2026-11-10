import * as migration_20261110_163506_initial from './20261110_163506_initial';

export const migrations = [
  {
    up: migration_20261110_163506_initial.up,
    down: migration_20261110_163506_initial.down,
    name: '20261110_163506_initial'
  },
];
