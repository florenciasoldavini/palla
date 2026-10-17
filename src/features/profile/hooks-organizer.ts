import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getOrganizerProfile,
  updateOrganizerDetails
} from "./services/organizer-profile.service";
import type { OrganizerDetailsInput } from "@/features/organizer/domain";
const organizerProfileKey = (id?: string) => ["organizer-profile", id] as const;
export function useOrganizerProfile(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: organizerProfileKey(id),
    queryFn: () => getOrganizerProfile(id!),
    enabled: !!id && enabled
  });
}
export function useUpdateOrganizerDetails(id: string | undefined) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: OrganizerDetailsInput) => {
      if (!id) throw Error("Sign in to update your organizer profile.");
      return updateOrganizerDetails(id, input);
    },
    onSuccess: (data) => client.setQueryData(organizerProfileKey(id), data)
  });
}
