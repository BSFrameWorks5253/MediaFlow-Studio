import React from 'react';
import { LoadingTemplateId, LoadingTemplateProps } from './types';
import { DataflowFlagshipLoader } from './DataflowFlagshipLoader';
import { AstralFrontierLoader } from './AstralFrontierLoader';
import { WalbiKineticLoader } from './WalbiKineticLoader';
import { CosmosEditorialLoader } from './CosmosEditorialLoader';
import { AircordCyberGridLoader } from './AircordCyberGridLoader';
import { MobbinDynamicPillLoader } from './MobbinDynamicPillLoader';
import { MobbinMinimalSheetLoader } from './MobbinMinimalSheetLoader';

export * from './types';
export {
  DataflowFlagshipLoader,
  AstralFrontierLoader,
  WalbiKineticLoader,
  CosmosEditorialLoader,
  AircordCyberGridLoader,
  MobbinDynamicPillLoader,
  MobbinMinimalSheetLoader,
};
export { LoadingScreenPreviewModal } from './LoadingScreenPreviewModal';

export const renderLoadingTemplate = (
  templateId: LoadingTemplateId,
  props: LoadingTemplateProps
): React.ReactElement => {
  switch (templateId) {
    case 'astral':
      return <AstralFrontierLoader {...props} />;
    case 'walbi':
      return <WalbiKineticLoader {...props} />;
    case 'cosmos':
      return <CosmosEditorialLoader {...props} />;
    case 'aircord':
      return <AircordCyberGridLoader {...props} />;
    case 'mobbin-pill':
      return <MobbinDynamicPillLoader {...props} />;
    case 'mobbin-sheet':
      return <MobbinMinimalSheetLoader {...props} />;
    case 'flagship':
    default:
      return <DataflowFlagshipLoader {...props} />;
  }
};
