// Garden Component Library
// Export base class and all components

export { GardenElement } from './GardenElement.js';

// Components
export { GardenButton } from './components/garden-button.js';
export { GardenInput } from './components/garden-input.js';
export { GardenCard } from './components/garden-card.js';
export { GardenBlock } from './components/garden-block.js';
export { GardenCheckbox } from './components/garden-checkbox.js';
export { GardenRadio } from './components/garden-radio.js';
export { GardenModal } from './components/garden-modal.js';
export { GardenWaveform } from './components/garden-waveform.js';
export { GardenBreadcrumb } from './components/garden-breadcrumb.js';
export type { BreadcrumbItem } from './components/garden-breadcrumb.js';
export { GardenGrid } from './components/garden-grid.js';
export { GardenPlaceholder } from './components/garden-placeholder.js';
export { GardenTooltip } from './components/garden-tooltip.js';
export { GardenWaypoint } from './components/garden-waypoint.js';
export type {
  WaypointHistoryItem,
  WaypointConnection,
  WaypointRecentItem,
  WaypointSearchItem,
  WaypointConnectTarget,
} from './components/garden-waypoint.js';
export { GardenContextMenu } from './components/garden-context-menu.js';
export type {
  ContextMenuItem,
  MenuContext,
} from './components/garden-context-menu.js';
export { GardenConnectionsModal } from './components/garden-connections-modal.js';
export type { BlockConnection } from './components/garden-connections-modal.js';

// Block detail view components
export { GardenBlockFrame } from './components/garden-block-frame.js';
export { GardenArchiveInfo } from './components/garden-archive-info.js';
export { GardenNotesSection } from './components/garden-notes-section.js';
export { GardenChannelsModal } from './components/garden-channels-modal.js';
export type { ChannelItem } from './components/garden-channels-modal.js';
export { GardenMetadataModal } from './components/garden-metadata-modal.js';
export type { MetadataValues } from './components/garden-metadata-modal.js';
export { GardenImportModal } from './components/garden-import-modal.js';
export type { ImportContentType, MediaSubtype, ImportFormValues } from './components/garden-import-modal.js';
export { GardenSearchModal } from './components/garden-search-modal.js';
export type { SearchChannel, SearchBlock, SearchData } from './components/garden-search-modal.js';
export { GardenConfirmModal } from './components/garden-confirm-modal.js';

// Media block components
export { GardenImageBlock } from './components/garden-image-block.js';
export { GardenVideoBlock } from './components/garden-video-block.js';
export { GardenAudioBlock } from './components/garden-audio-block.js';
