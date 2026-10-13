import { RoleTabs } from "@/components/navigation/role-tabs";
export default function PlayerLayout() {
  return (
    <RoleTabs
      mode="player"
      routes={{ home: "discover", secondary: "my-games", profile: "profile" }}
    />
  );
}
