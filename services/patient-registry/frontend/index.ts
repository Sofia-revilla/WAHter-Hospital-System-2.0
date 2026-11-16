// Patient Registry's screens: Registration and Patient Search (Admitting
// Clerk, and the Nurse and Billing Staff where UC-01 and US-5 let them), and
// Identity Review (System Administrator). Other portals use api.ts to turn
// patient IDs into names.
export { RegistrationView } from "./RegistrationView";
export { PatientSearchView } from "./PatientSearchView";
export { IdentityReviewView } from "./IdentityReviewView";
export { fetchPatientsByIds, type PatientIdentity } from "./api";
