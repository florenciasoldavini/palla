import { Users } from "lucide-react-native";
import { ContentState, type ContentStateProps } from "./content-state";

export function EmptyState({ icon = Users, ...props }: ContentStateProps) {
  return <ContentState icon={icon} {...props} />;
}
