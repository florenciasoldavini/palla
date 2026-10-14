import { AuthContext } from "@/features/auth/auth-provider";
import { organizerSessionsKey } from "@/features/sessions/hooks/use-organizer-sessions";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useContext } from "react";
import type { Attendee } from "../domain";
import {
  loadOrganizerRoster,
  setAttendance
} from "../services/attendance.service";

export function useOrganizerAttendance(sessionId: string) {
  const { user } = useContext(AuthContext);
  const client = useQueryClient();
  const key = ["organizer-roster", user?.id, sessionId] as const;
  const roster = useQuery({
    queryKey: key,
    queryFn: () => loadOrganizerRoster(sessionId),
    enabled: !!sessionId && user?.organizer_status === "active"
  });
  const attendance = useMutation({
    mutationFn: setAttendance,
    onSuccess: (record) => {
      client.setQueryData<Attendee[]>(key, (rows) =>
        rows?.map((row) => (row.id === record.id ? { ...row, ...record } : row))
      );
    },
    onSettled: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: key }),
        client.invalidateQueries({ queryKey: organizerSessionsKey(user?.id) })
      ]);
    }
  });
  return { roster, attendance };
}
