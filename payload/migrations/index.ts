import * as migration_20261110_163506_initial from './20261110_163506_initial';
import * as migration_20261110_172608_media_gcs_columns from './20261110_172608_media_gcs_columns';

export const migrations = [
  {
    up: migration_20261110_163506_initial.up,
    down: migration_20261110_163506_initial.down,
    name: '20261110_163506_initial',
  },
  {
    up: migration_20261110_172608_media_gcs_columns.up,
    down: migration_20261110_172608_media_gcs_columns.down,
    name: '20261110_172608_media_gcs_columns'
  },
];
