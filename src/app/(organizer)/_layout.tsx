import { RoleTabs } from "@/components/navigation/role-tabs";
export default function OrganizerLayout() {
  return (
    <RoleTabs
      mode="organizer"
      routes={{
        home: "dashboard",
        secondary: "sessions",
        profile: "organizer-profile"
      }}
    />
  );
}
