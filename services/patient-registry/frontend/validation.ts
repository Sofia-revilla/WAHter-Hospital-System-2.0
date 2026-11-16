import type { Demographics } from "./api";

// The same rules as the Patient Registry's PatientDemographicsDto, so the
// form can mark a problem before anything is sent (UC-01 extension 5a). The
// service checks again; its answer also comes back per field and is shown the
// same way.

export type FieldErrors = Partial<Record<string, string>>;

const PIN = /^\d{12}$/;
const MOBILE = /^(09|\+639)\d{9}$/;

export function validateDemographics(form: Demographics): FieldErrors {
  const errors: FieldErrors = {};
  if (!form.givenName.trim()) errors.givenName = "Given name is required";
  if (!form.familyName.trim()) errors.familyName = "Family name is required";
  if (!form.sex) errors.sex = "Sex is required";

  if (!form.birthDate) {
    errors.birthDate = "Birth date is required (YYYY-MM-DD)";
  } else {
    const born = new Date(`${form.birthDate}T00:00:00`);
    const oldest = new Date();
    oldest.setFullYear(oldest.getFullYear() - 130);
    if (Number.isNaN(born.getTime()) || born > new Date() || born < oldest) {
      errors.birthDate = "Birth date can't be in the future or more than 130 years ago";
    }
  }

  if (!form.address.barangay.trim()) errors["address.barangay"] = "Barangay is required";
  if (!form.address.municipality.trim()) errors["address.municipality"] = "Municipality or city is required";
  if (!form.address.province.trim()) errors["address.province"] = "Province is required";

  if (form.contactNumber && !MOBILE.test(form.contactNumber.trim())) {
    errors.contactNumber = "Contact number should look like 09XXXXXXXXX";
  }
  if (form.philhealthPin && !PIN.test(form.philhealthPin.trim())) {
    errors.philhealthPin = "PhilHealth PIN must be 12 digits";
  }
  return errors;
}

// Strips empty optional fields so the service doesn't validate blanks
export function toPayload(form: Demographics): Demographics {
  const optional = (value?: string) => value?.trim() || undefined;
  return {
    givenName: form.givenName.trim(),
    middleName: optional(form.middleName),
    familyName: form.familyName.trim(),
    suffix: optional(form.suffix),
    sex: form.sex,
    birthDate: form.birthDate,
    civilStatus: optional(form.civilStatus),
    contactNumber: optional(form.contactNumber),
    address: {
      street: optional(form.address.street),
      barangay: form.address.barangay.trim(),
      municipality: form.address.municipality.trim(),
      province: form.address.province.trim(),
    },
    philhealthPin: optional(form.philhealthPin?.replace(/[\s-]/g, "")),
  };
}

export const EMPTY_DEMOGRAPHICS: Demographics = {
  givenName: "",
  middleName: "",
  familyName: "",
  suffix: "",
  sex: "",
  birthDate: "",
  civilStatus: "",
  contactNumber: "",
  // the pilot site's municipality as a starting point; the clerk changes it
  address: { street: "", barangay: "", municipality: "Concepcion", province: "Tarlac" },
  philhealthPin: "",
};
