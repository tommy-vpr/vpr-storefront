'use client';

import { DefaultCell } from '@payloadcms/ui';
import type { DefaultCellComponentProps } from 'payload';

/** Keep the editor link on titles regardless of the selected column order. */
export function CmsRecordTitleCell(props: DefaultCellComponentProps) {
  return <DefaultCell {...props} link />;
}
