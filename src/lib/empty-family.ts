/**
 * MD.Family — empty state for new users.
 *
 * When a user logs in or registers for the first time, they get an empty
 * family with no children, no devices, no alerts, no contacts, etc.
 * They build their family from scratch via the "Add child" button.
 */

import type { Family } from "./types";

export function createEmptyFamily(ownerId: string, ownerName: string): Family {
  return {
    id: "",  // will be set after backend creates the family
    name: `${ownerName}'s Family`,
    ownerId,
    members: [],
    children: [],
    schools: [],
    contacts: [],
    webCategories: [],
    websiteExceptions: [],
    safeZones: [],
    alerts: [],
    activity: [],
    backups: [],
    classificationReports: [],
    motherPermissions: "no_access",
    motherGrants: [],
    familyPauseActive: false,
    safeSearchEnabled: true,
    localVpnEnabled: true,
    extensionRequests: [],
    liveSessions: [],
  };
}
