const VOTER_ID_KEY = 'rotavoto_voter_id';
const VOTER_NAME_KEY = 'rotavoto_voter_name';
const VOTER_VEHICLE_KEY = 'rotavoto_voter_vehicle';
const VOTER_PHONE_KEY = 'rotavoto_voter_phone';
const ADMIN_TOKEN_KEY = 'rotavoto_admin_token';
const ADMIN_USERNAME_KEY = 'rotavoto_admin_username';

export function getAdminSession(): { token: string | null; username: string | null } {
  return {
    token: localStorage.getItem(ADMIN_TOKEN_KEY),
    username: localStorage.getItem(ADMIN_USERNAME_KEY),
  };
}

export function saveAdminSession(token: string, username: string) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
  localStorage.setItem(ADMIN_USERNAME_KEY, username);
}

export function clearAdminSession() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(ADMIN_USERNAME_KEY);
}

export function getOrCreateVoterId(): string {
  let id = localStorage.getItem(VOTER_ID_KEY);
  if (!id) {
    id = 'voter-' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    localStorage.setItem(VOTER_ID_KEY, id);
  }
  return id;
}

export function getStoredVoterProfile(): {
  id: string;
  name: string;
  vehicle: string;
  phone: string;
} {
  const id = getOrCreateVoterId();
  const name = localStorage.getItem(VOTER_NAME_KEY) || '';
  const vehicle = localStorage.getItem(VOTER_VEHICLE_KEY) || '';
  const phone = localStorage.getItem(VOTER_PHONE_KEY) || '';
  return { id, name, vehicle, phone };
}

export function saveStoredVoterProfile(profile: {
  name: string;
  vehicle?: string;
  phone?: string;
}) {
  if (profile.name !== undefined) {
    localStorage.setItem(VOTER_NAME_KEY, profile.name.trim());
  }
  if (profile.vehicle !== undefined) {
    localStorage.setItem(VOTER_VEHICLE_KEY, profile.vehicle.trim());
  }
  if (profile.phone !== undefined) {
    localStorage.setItem(VOTER_PHONE_KEY, profile.phone.trim());
  }
}
