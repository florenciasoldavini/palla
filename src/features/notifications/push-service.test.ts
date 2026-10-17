import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  constants: {
    executionEnvironment: "bare",
    easConfig: { projectId: "palla-project" }
  },
  getItem: vi.fn(async () => "installation"),
  setItem: vi.fn(),
  register: vi.fn(),
  unregister: vi.fn(),
  permissions: vi.fn(),
  request: vi.fn(),
  token: vi.fn(),
  channel: vi.fn(),
  dismiss: vi.fn(),
  clear: vi.fn()
}));
vi.mock("react-native", () => ({ Platform: { OS: "android" } }));
vi.mock("expo-constants", () => ({ default: mock.constants }));
vi.mock("expo-secure-store", () => ({
  getItemAsync: mock.getItem,
  setItemAsync: mock.setItem
}));
vi.mock("expo-crypto", () => ({ randomUUID: () => "new-installation" }));
vi.mock("./repositories/push.repository", () => ({
  registerPushDevice: mock.register,
  unregisterPushDevice: mock.unregister
}));
vi.mock("expo-notifications", () => ({
  getPermissionsAsync: mock.permissions,
  requestPermissionsAsync: mock.request,
  getExpoPushTokenAsync: mock.token,
  setNotificationChannelAsync: mock.channel,
  AndroidImportance: { HIGH: 4 },
  IosAuthorizationStatus: { PROVISIONAL: 3 },
  dismissAllNotificationsAsync: mock.dismiss,
  clearLastNotificationResponseAsync: mock.clear
}));
beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mock.constants.executionEnvironment = "bare";
  mock.permissions.mockResolvedValue({ granted: true });
  mock.token.mockResolvedValue({ data: "ExpoPushToken[fake]" });
});
describe("push installation lifecycle", () => {
  it("does not import or register notifications in Expo Go", async () => {
    mock.constants.executionEnvironment = "storeClient";
    const service = await import("./services/push.service");
    await service.registerCurrentPushDevice("actor", () => true);
    expect(mock.permissions).not.toHaveBeenCalled();
    expect(mock.register).not.toHaveBeenCalled();
  });
  it("uses the Palla project and stable installation after permission", async () => {
    const service = await import("./services/push.service");
    await service.registerCurrentPushDevice("actor", () => true);
    expect(mock.token).toHaveBeenCalledWith({ projectId: "palla-project" });
    expect(mock.register).toHaveBeenCalledWith(
      "installation",
      "ExpoPushToken[fake]",
      "android",
      "actor"
    );
    expect(mock.channel).toHaveBeenCalledBefore(mock.token);
  });
  it("cleans up denied permissions without repeatedly prompting", async () => {
    mock.permissions.mockResolvedValue({ granted: false, canAskAgain: false });
    const service = await import("./services/push.service");
    await service.registerCurrentPushDevice("actor", () => true);
    expect(mock.request).not.toHaveBeenCalled();
    expect(mock.token).not.toHaveBeenCalled();
    expect(mock.unregister).toHaveBeenCalledWith("installation");
  });
  it("does not let an in-flight token fetch re-register after sign-out", async () => {
    let resolve!: (token: { data: string }) => void;
    mock.token.mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolve = r;
        })
    );
    const service = await import("./services/push.service");
    const registering = service.registerCurrentPushDevice(
      "old-actor",
      () => true
    );
    await vi.waitFor(() => expect(mock.token).toHaveBeenCalled());
    const signingOut = service.unregisterCurrentPushDevice();
    resolve({ data: "ExpoPushToken[late]" });
    await registering;
    await signingOut;
    expect(mock.register).not.toHaveBeenCalled();
    expect(mock.unregister).toHaveBeenCalledWith("installation");
    expect(mock.dismiss).toHaveBeenCalled();
  });
});
