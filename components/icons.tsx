import React from 'react';

interface IconProps {
  className?: string;
}

const Icon: React.FC<IconProps & { children: React.ReactNode }> = ({ className, children }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {children}
  </svg>
);

export const AlertCircleIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <line x1="12" y1="16" x2="12.01" y2="16"></line>
  </Icon>
);

export const PlusIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </Icon>
);

export const Trash2Icon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    <line x1="10" y1="11" x2="10" y2="17"></line>
    <line x1="14" y1="11" x2="14" y2="17"></line>
  </Icon>
);

export const ArrowUpIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <line x1="12" y1="19" x2="12" y2="5"></line>
    <polyline points="5 12 12 5 19 12"></polyline>
  </Icon>
);

export const ArrowDownIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <polyline points="19 12 12 19 5 12"></polyline>
  </Icon>
);

export const CheckCircleIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </Icon>
);

export const InfoIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="16" x2="12" y2="12"></line>
    <line x1="12" y1="8" x2="12.01" y2="8"></line>
  </Icon>
);

export const SettingsIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
  </Icon>
);

export const CalculatorIcon: React.FC<IconProps> = (props) => (
    <Icon {...props}>
        <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
        <line x1="8" y1="6" x2="16" y2="6"></line>
        <line x1="8" y1="10" x2="16" y2="10"></line>
        <line x1="8" y1="14" x2="16" y2="14"></line>
        <line x1="8" y1="18" x2="16" y2="18"></line>
    </Icon>
);

export const DropletIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0L12 2.69z"></path>
  </Icon>
);

export const LayersIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
    <polyline points="2 17 12 22 22 17"></polyline>
    <polyline points="2 12 12 17 22 12"></polyline>
  </Icon>
);

export const TrendingUpIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
    <polyline points="17 6 23 6 23 12"></polyline>
  </Icon>
);

export const ActivityIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
  </Icon>
);

export const ZapIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
  </Icon>
);

export const ChevronRightIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <polyline points="9 18 15 12 9 6"></polyline>
  </Icon>
);

export const ChevronDownIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <polyline points="6 9 12 15 18 9"></polyline>
  </Icon>
);

export const BeakerIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M4.5 3h15M6 3v12c0 1.1.9 2 2 2h8a2 2 0 002-2V3M6 11h12"></path>
  </Icon>
);

export const GaugeIcon: React.FC<IconProps> = (props) => (
    <Icon {...props}>
        <path d="M12 2a10 10 0 00-10 10c0 4.42 2.87 8.17 6.84 9.5.5.08 1.04.15 1.57.18V22h.18c.53-.03 1.07-.1 1.57-.18C19.13 20.17 22 16.42 22 12A10 10 0 0012 2zm0 18a8 8 0 118-8 8 8 0 01-8 8z" />
        <path d="M12 6a1 1 0 00-1 1v5.59l-2.71 2.7a1 1 0 000 1.42 1 1 0 001.42 0L12 15.41l2.29 2.3a1 1 0 001.42 0 1 1 0 000-1.42L13 12.59V7a1 1 0 00-1-1z" />
    </Icon>
);

export const LightbulbIcon: React.FC<IconProps> = (props) => (
  <Icon {...props}>
    <path d="M9 18h6" />
    <path d="M10 22h4" />
    <path d="M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7z" />
  </Icon>
);
