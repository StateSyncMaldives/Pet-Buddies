import type { ClinicService } from '../../domain/clinics/clinic-service'

export function getClinics(input: { clinicService: ClinicService }) {
  return input.clinicService.listClinics()
}
