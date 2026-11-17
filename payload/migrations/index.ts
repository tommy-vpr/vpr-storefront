import * as migration_20261110_163506_initial from './20261110_163506_initial';
import * as migration_20261110_172608_media_gcs_columns from './20261110_172608_media_gcs_columns';
import * as migration_20261110_175039_navigation from './20261110_175039_navigation';
import * as migration_20261111_231522_product_page from './20261111_231522_product_page';
import * as migration_20261112_000339_age_verification from './20261112_000339_age_verification';

export const migrations = [
  {
    up: migration_20261110_163506_initial.up,
    down: migration_20261110_163506_initial.down,
    name: '20261110_163506_initial',
  },
  {
    up: migration_20261110_172608_media_gcs_columns.up,
    down: migration_20261110_172608_media_gcs_columns.down,
    name: '20261110_172608_media_gcs_columns',
  },
  {
    up: migration_20261110_175039_navigation.up,
    down: migration_20261110_175039_navigation.down,
    name: '20261110_175039_navigation',
  },
  {
    up: migration_20261111_231522_product_page.up,
    down: migration_20261111_231522_product_page.down,
    name: '20261111_231522_product_page',
  },
  {
    up: migration_20261112_000339_age_verification.up,
    down: migration_20261112_000339_age_verification.down,
    name: '20261112_000339_age_verification'
  },
];
