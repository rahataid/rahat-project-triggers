export interface ActivityLibrary {
  id: number;
  uuid: string;
  title: string;
  description: string;
  leadTime: string;
  phase: {
    name: string;
    uuid: string;
  };
  category: {
    name: string;
    uuid: string;
  };
  isAutomated: boolean;
  manager: Record<string, any>;
  activityDocuments: Record<string, any>[];
  activityCommunication: Record<string, any>[];
  activityPayout: Record<string, any>[];
  createdAt: Date;
  updatedAt: Date;
  isTemplate: boolean;
  isDeleted: boolean;
}

export const activities = [
  {
    id: 1111,
    uuid: '2f30c0b6-2b4d-4f45-9723-2cde1ed9a177',
    title: 'Review and addressal of complaint and feedback mechanism',
    description:
      'The activities related to review and addressal of complaint and feedback mechanism.',
    leadTime: '',
    phase: { name: 'Preparedness', uuid: 'phase-uuid-1' },
    category: {
      name: 'Complaints Handling Mechanism',
      uuid: 'category-uuid-1',
    },
    manager: {},
    isAutomated: false,
    activityDocuments: [],
    activityCommunication: [],
    activityPayout: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    isTemplate: true,
    isDeleted: false,
  },
  {
    id: 2222,
    uuid: 'b9cef2b7-262d-4bc1-aa05-2d12131810d7',
    title: 'Send outlook and general comms to beneficiaries',
    description:
      'The activities related to sending outlook and general comms to beneficiaries.',
    leadTime: '',
    phase: { name: 'Preparedness', uuid: 'phase-uuid-1' },
    category: { name: 'Early Warning Communication', uuid: 'category-uuid-2' },
    isAutomated: false,
    manager: {},
    activityDocuments: [],
    activityCommunication: [],
    activityPayout: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    isTemplate: true,
    isDeleted: false,
  },
  {
    id: 3333,
    uuid: 'f79e299d-cb57-4d65-91f6-a2fcf4b9c748',
    title:
      'Daily weather forecast update to the STRONG in DRM team - Flag activation possiblitie',
    description:
      'The activities related to daily weather forecast update to the STRONG in DRM team - Flag activation possibilities.',
    leadTime: '5 days',
    phase: { name: 'Readiness', uuid: 'phase-uuid-2' },
    category: { name: 'Early Warning Communication', uuid: 'category-uuid-2' },
    isAutomated: false,
    activityDocuments: [],
    activityCommunication: [],
    manager: {},
    activityPayout: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    isTemplate: true,
    isDeleted: false,
  },
  {
    id: 4444,
    uuid: 'fa53d7b6-45e3-4fb8-ac50-4e467c3a9504',
    title: 'Final verification of the beneficiary data',
    description:
      'The activities related to final verification of the beneficiary data.',
    leadTime: '5 days',
    phase: { name: 'Readiness', uuid: 'phase-uuid-2' },
    category: { name: 'General Action', uuid: 'category-uuid-3' },
    isAutomated: false,
    manager: {},
    activityDocuments: [],
    activityCommunication: [],
    activityPayout: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    isTemplate: true,
    isDeleted: false,
  },
  {
    id: 5555,
    uuid: 'cfb8a57b-4c51-4d88-9a8a-3e530b73b36d',
    title:
      'Inform stakeholders to alert them of the activation phase activation',
    description:
      'The activities related to informing stakeholders to alert them of the activation phase activation.',
    leadTime: '5 days',
    phase: { name: 'Activation', uuid: 'phase-uuid-3' },
    category: { name: 'Early Warning Communication', uuid: 'category-uuid-2' },
    isAutomated: true,
    activityDocuments: [],
    activityCommunication: [],
    activityPayout: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    isTemplate: true,
    manager: {},
    isDeleted: false,
  },
];
