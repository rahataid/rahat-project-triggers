import { JWT } from 'google-auth-library';
import { GoogleSpreadsheet, GoogleSpreadsheetRow } from 'google-spreadsheet';
import axios from 'axios';
import fs from 'fs';

const google_cred = require(`../config/google.json`);

const sheetId = '1Wb-IFYbyx1LHmEic-ylE_NIym3Zn1dSh4';
const sheetName = 'activities Punarbas';
const riverBasin = 'Doda river at East-West Highway';
const activeYear = '2025';

const accessToken = '';
const baseUrl = 'https://api.aa.xs.rahat.io/v1';

const projectActionUrl = (projectId: string): string => `${baseUrl}/projects/${projectId}/actions`;

const projectId = '8fc31aef-362b-4923-ab1c-2ae7b107719e';

type ApiAuth = {
    url: string;
    accessToken: string;
};
type NameIds = {
    uuid: string;
    name: string;
};
type Activity = {
    title: string;
    leadTime: string;
    phaseId: string;
    categoryId: string;
    responsibility: string;
    source: string;
    description: string;
    isAutomated: boolean;
    manager: {
        id: string;
        name: string;
        email: string;
        phone: string;
    };
    activityDocuments: {
    }[];
    activityCommunication: {
    }[];
};

const serviceAccountAuth = new JWT({
    email: google_cred.client_email,
    key: google_cred.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getGoogleSheetsData = async (
    sheetId: string,
    sheetName: string
): Promise<GoogleSpreadsheetRow<Record<string, any>>[]> => {
    try {
        const doc = new GoogleSpreadsheet(sheetId, serviceAccountAuth);
        await doc.loadInfo();
        const sheet = doc.sheetsByTitle[sheetName];
        const rows = await sheet.getRows();
        return rows;
    } catch (error) {
        console.log("Error in getGoogleSheetsData", sheetId, sheetName)
        console.log(`Error: `, error?.response?.data || error)
        return null;
    }
};

const getUsers = async (config: ApiAuth): Promise<(NameIds & { email: string, phone: string })[]> => {
    const getUsersPayload = {
        "action": "ms.users.getAll",
        "payload": {}
    }
    const response = await axios.get(`${baseUrl}/users?page=1&perPage=100`, {
        headers: {
            Authorization: `Bearer ${config.accessToken}`,
        },
    });
    const { data } = response.data;
    const users = data.map((user: any) => ({
        uuid: user.uuid,
        name: user.name,
        email: user.email,
        phone: user.phone,
    }));
    return users;
}

const getPhaseIds = async (config: ApiAuth): Promise<NameIds[]> => {
    const getPhasePayload = {
        action: "ms.phases.getAll",
        payload: {
            "activeYear": activeYear,
            "riverBasin": riverBasin
        }
    }
    const response = await axios.post(config.url, getPhasePayload, {
        headers: {
            Authorization: `Bearer ${config.accessToken}`,
        },
    });
    const { data } = response.data;
    const phases = data.map((phase: any) => ({
        uuid: phase.uuid,
        name: phase.name,
    }));
    return phases;
}

const getCategoryIds = async (config: ApiAuth): Promise<NameIds[]> => {
    const getCategoryPayload = {
        "action": "ms.activityCategories.getAll",
        "payload": {}
    }
    const response = await axios.post(config.url, getCategoryPayload, {
        headers: {
            Authorization: `Bearer ${config.accessToken}`,
        },
    });
    const { data } = response.data;
    const categories = data.map((category: any) => ({
        uuid: category.uuid,
        name: category.name,
    }));
    return categories;
}

const addActivity = async (config: ApiAuth, activity: Activity): Promise<void> => {
    const addActivityPayload = {
        "action": "ms.activities.add",
        "payload": activity
    }
    const response = await axios.post(config.url, addActivityPayload, {
        headers: {
            Authorization: `Bearer ${config.accessToken}`,
        },
    });
    console.log(response.data);
}

const updateIdInGSheet = async (
    sheetId: string,
    sheetName: string,
    apiConfig: ApiAuth
): Promise<void> => {
    const rows = await getGoogleSheetsData(sheetId, sheetName);

    const phaseIds = await getPhaseIds(apiConfig);
    console.log({ phaseIds })

    const categoryIds = await getCategoryIds(apiConfig);
    console.log({ categoryIds })

    const users = await getUsers(apiConfig);
    console.log({ users })

    for (let row of rows) {
        await sleep(1000);
        if (!row.get('phase') && !row.get('category')) continue;
        if (row.get('phase')) {
            const phaseId = phaseIds.find((phase) => phase.name === row.get('phase'))?.uuid;
            row.set('phaseId', phaseId);
        }
        if (row.get('category')) {
            const categoryId = categoryIds.find((category) => category.name === row.get('category'))?.uuid;
            row.set('categoryId', categoryId);
        }
        if (row.get('responsible')) {
            const user = users.find((user) => user.email === row.get('responsible'));
            row.set('responsibleId', user?.uuid || "❌ NO USER ID FOUND. PLEASE CHECK THE EMAIL");
            row.set('responsibleName', user?.name || "❌ NO USER NAME FOUND. PLEASE CHECK THE EMAIL");
            row.set('responsiblePhone', user?.phone || "");
        }

        console.log({ row });
        await row.save();
    }
}


// //Rahat Staging
// const sheetId = '1sMLv7S_WgpQgbX_HHqeA6ZRyt5K-W-xdT2oZSsDAKmY';
// const sheetName = 'activities';
// const accessToken = '';
// const baseUrl = 'https://api.aa.xs.rahat.io/v1';
// const projectActionUrl = (projectId: string): string => `${baseUrl}/projects/${projectId}/actions`;
// const projectId = '369e043e-bc2e-42e5-9222-e2f9ac29962a';

// //Rahat Demo Training
// const sheetId = '1sMLv7S_WgpQgbX_HHqeA6ZRyt5K-W-xdT2oZSsDAKmY';
// const sheetName = 'activities';
// const accessToken = ''
// const baseUrl = 'https://api.aa-rumsan.drc.np.rahat.io/v1';
// const projectActionUrl = (projectId: string): string => `${baseUrl}/projects/${projectId}/actions`;
// const projectId = '4c51c884-6c84-41fe-a4b9-149c70e667f2';

//Rahat Demo unicef



(async () => {
    const apiConfig = {
        url: projectActionUrl(projectId),
        accessToken
    }

    // await updateIdInGSheet(sheetId, sheetName, apiConfig);

    // console.log("Updated IDs in GSheet");

    // return;
    const activitiesData = await getGoogleSheetsData(sheetId, sheetName);

    for (let activity of activitiesData) {
        await sleep(1000);
        const activityData: Activity = {
            title: activity.get('activityTitle'),
            leadTime: activity.get('leadTime'),
            phaseId: activity.get('phaseId'),
            categoryId: activity.get('categoryId'),
            responsibility: activity.get('responsible'),
            source: activity.get('responsibleStation'),
            description: activity.get('remarks'),
            isAutomated: activity.get('activityType') === 'Automatic' ? true : false,
            manager: {
                id: activity.get('responsibleId'),
                name: activity.get('responsibleName'),
                email: activity.get('responsible'),
                phone: activity.get('responsiblePhone')
            },
            activityCommunication: [],
            activityDocuments: [],
        }

        console.log({ activityData })

        if (!activityData.title) continue;

        try {
            await addActivity(apiConfig, activityData);
        } catch (error) {
            console.log("--------------------------------")
            console.error("Error in addActivity", error?.response?.data?.message || error?.message)
            console.log("--------------------------------")
        }
    }


})();