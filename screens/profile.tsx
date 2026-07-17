import {
  AppButton,
  AppCard,
  AppText,
  FieldMessage,
  NavScreenHeader,
  PasswordVisibilityToggle,
  Screen,
  SegmentedTabs,
  TextField
} from "@/components/atoms";
import { atomPalette, atomRadii, atomSpacing } from "@/components/atoms/theme";
import { authCardMaxWidth } from "@/components/auth/AuthShell";
import { AuthContext } from "@/contexts/auth";
import { useUploadProfileAvatar } from "@/features/profile/hooks";
import type { ProfileAvatarAsset } from "@/features/profile/repositories/profile-avatar.repository";
import {
  profileInfoSchema,
  profilePasswordSchema,
  type ProfileInfoInput,
  type ProfilePasswordInput
} from "@/features/profile/validation";
import { updatePassword } from "@/lib/auth";
import { getSupabaseErrorMessage, supabase } from "@/lib/supabase";
import { zodResolver } from "@hookform/resolvers/zod";
import type { UserIdentity } from "@supabase/supabase-js";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import {
  CameraIcon,
  CheckCircleIcon,
  LockIcon,
  LogoutIcon,
  MailIcon,
  PhoneIcon,
  UserIcon
} from "@/components/icons";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  type ViewStyle
} from "react-native";

const appleLogo = require("@/assets/images/auth/apple-logo.png");
const googleLogo = require("@/assets/images/auth/google-logo.png");

type IdentityProvider = "apple" | "email" | "google";
type ProfileTab = "profile" | "security" | "methods";

const providerCopy = {
  apple: {
    label: "Apple",
    supporting: "Apple account"
  },
  email: {
    label: "Email",
    supporting: "Password access"
  },
  google: {
    label: "Google",
    supporting: "Google account"
  }
} satisfies Record<IdentityProvider, { label: string; supporting: string }>;

const profileTabs = [
  { value: "profile", label: "Profile" },
  { value: "security", label: "Security" },
  { value: "methods", label: "Sign-In" }
] satisfies { value: ProfileTab; label: string }[];

function getProfileInfoDefaults(
  profile:
    | {
        avatar?: string | null;
        first_name?: string | null;
        last_name?: string | null;
        phone_number?: string | null;
      }
    | null
    | undefined
): ProfileInfoInput {
  return {
    avatar: profile?.avatar ?? "",
    firstName: profile?.first_name ?? "",
    lastName: profile?.last_name ?? "",
    phoneNumber: profile?.phone_number ?? ""
  };
}

export default function ProfileScreen() {
  const { logOut, session, updateUserProfile, user } = useContext(AuthContext);
  const [avatarAsset, setAvatarAsset] = useState<ProfileAvatarAsset | null>(
    null
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [securityStatus, setSecurityStatus] = useState<string | null>(null);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [identities, setIdentities] = useState<UserIdentity[]>([]);
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [identityLoading, setIdentityLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>("profile");
  const uploadAvatarMutation = useUploadProfileAvatar();
  const profileForm = useForm<ProfileInfoInput>({
    defaultValues: getProfileInfoDefaults(user),
    mode: "onChange",
    resolver: zodResolver(profileInfoSchema)
  });
  const securityForm = useForm<ProfilePasswordInput>({
    defaultValues: {
      confirmPassword: "",
      password: ""
    },
    mode: "onChange",
    resolver: zodResolver(profilePasswordSchema)
  });
  const {
    control: profileControl,
    formState: { isDirty: isProfileDirty, isValid: isProfileValid },
    handleSubmit: handleProfileSubmit,
    reset: resetProfileForm,
    watch: watchProfileField
  } = profileForm;
  const {
    control: passwordControl,
    formState: { isValid: isPasswordChangeValid },
    handleSubmit: handlePasswordSubmit,
    reset: resetPasswordForm
  } = securityForm;
  const avatar = watchProfileField("avatar");
  const isProfileSaving = isSaving || uploadAvatarMutation.isPending;
  const isProfileSaveDisabled =
    isProfileSaving || !isProfileValid || (!isProfileDirty && !avatarAsset);

  const linkedProviders = useMemo(() => {
    return new Set(
      identities.map((identity) => identity.provider.toLowerCase())
    );
  }, [identities]);

  const refreshIdentities = useCallback(async () => {
    if (!supabase || !session) {
      setIdentities([]);
      return;
    }

    setIdentityLoading(true);
    setIdentityError(null);

    try {
      const { data, error } = await supabase.auth.getUserIdentities();

      if (error) {
        throw error;
      }

      setIdentities(data.identities);
    } catch (error) {
      setIdentityError(getSupabaseErrorMessage(error));
    } finally {
      setIdentityLoading(false);
    }
  }, [session]);

  useEffect(() => {
    setAvatarAsset(null);
    resetProfileForm(getProfileInfoDefaults(user));
    resetPasswordForm({
      confirmPassword: "",
      password: ""
    });
    setFormError(null);
    setStatusMessage(null);
    setSecurityError(null);
    setSecurityStatus(null);
  }, [
    session?.user.email,
    user?.avatar,
    user?.email,
    user?.first_name,
    user?.last_name,
    user?.phone_number,
    resetProfileForm,
    resetPasswordForm
  ]);

  useEffect(() => {
    void refreshIdentities();
  }, [refreshIdentities]);

  const saveProfile = handleProfileSubmit(async (values) => {
    if (!user) {
      setFormError("You must be signed in to update your profile.");
      return;
    }

    setIsSaving(true);
    setFormError(null);
    setStatusMessage(null);

    try {
      const avatarUrl = avatarAsset
        ? await uploadAvatarMutation.mutateAsync({
            asset: avatarAsset,
            userId: user.id
          })
        : values.avatar;

      const updatedUser = await updateUserProfile({
        avatar: avatarUrl,
        first_name: values.firstName.trim(),
        last_name: values.lastName,
        phone_number: values.phoneNumber
      });

      if (updatedUser) {
        setAvatarAsset(null);
        resetProfileForm(getProfileInfoDefaults(updatedUser));
        setStatusMessage("Profile updated");
      }
    } catch (error) {
      setFormError(getSupabaseErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  });

  const changePassword = handlePasswordSubmit(async ({ password }) => {
    setIsUpdatingPassword(true);
    setSecurityError(null);
    setSecurityStatus(null);

    try {
      await updatePassword(password);
      resetPasswordForm({
        confirmPassword: "",
        password: ""
      });
      setSecurityStatus("Password updated.");
    } catch (error) {
      setSecurityError(getSupabaseErrorMessage(error));
    } finally {
      setIsUpdatingPassword(false);
    }
  });

  return (
    <Screen>
      <View
        style={{
          alignSelf: "center",
          gap: atomSpacing[5],
          maxWidth: authCardMaxWidth,
          width: "100%"
        }}
      >
        <NavScreenHeader
          description={user?.email ?? session?.user.email}
          title="Profile"
        />

        <SegmentedTabs
          onChange={setActiveTab}
          options={profileTabs}
          value={activeTab}
        />

        {activeTab === "profile" ? (
          <AppCard padding="lg">
            <View style={{ gap: atomSpacing[5] }}>
              <View style={{ gap: atomSpacing[1] }}>
                <AppText variant="label">Profile</AppText>
                <AppText tone="muted">Personal details</AppText>
              </View>

              <View style={{ gap: atomSpacing[4] }}>
                <View
                  style={{
                    alignItems: "center",
                    gap: atomSpacing[3]
                  }}
                >
                  <AvatarPicker
                    currentUrl={avatar}
                    onChange={(asset) => {
                      setAvatarAsset(asset);
                      setFormError(null);
                      setStatusMessage(null);
                    }}
                    value={avatarAsset}
                  />
                </View>

                <Controller
                  control={profileControl}
                  name="firstName"
                  render={({ field, fieldState }) => (
                    <TextField
                      errorText={fieldState.error?.message}
                      label="First Name"
                      leftIcon={UserIcon}
                      onBlur={field.onBlur}
                      onChangeText={(value) => {
                        field.onChange(value);
                        setFormError(null);
                      }}
                      placeholder="First name"
                      required
                      size="md"
                      value={field.value}
                    />
                  )}
                />

                <Controller
                  control={profileControl}
                  name="lastName"
                  render={({ field }) => (
                    <TextField
                      label="Last Name"
                      leftIcon={UserIcon}
                      onBlur={field.onBlur}
                      onChangeText={(value) => {
                        field.onChange(value);
                        setFormError(null);
                      }}
                      placeholder="Last name"
                      size="md"
                      value={field.value}
                    />
                  )}
                />

                <Controller
                  control={profileControl}
                  name="phoneNumber"
                  render={({ field }) => (
                    <TextField
                      autoComplete="tel"
                      keyboardType="phone-pad"
                      label="Phone"
                      leftIcon={PhoneIcon}
                      onBlur={field.onBlur}
                      onChangeText={(value) => {
                        field.onChange(value);
                        setFormError(null);
                      }}
                      placeholder="Phone number"
                      size="md"
                      textContentType="telephoneNumber"
                      value={field.value}
                    />
                  )}
                />
              </View>

              <View style={{ gap: atomSpacing[3] }}>
                <AppButton
                  isDisabled={isProfileSaveDisabled}
                  loading={isProfileSaving}
                  onPress={() => {
                    void saveProfile();
                  }}
                  size="md"
                >
                  Save Profile
                </AppButton>

                {statusMessage ? (
                  <FieldMessage tone="success">{statusMessage}</FieldMessage>
                ) : null}
                {formError ? (
                  <FieldMessage tone="error">{formError}</FieldMessage>
                ) : null}
              </View>
            </View>
          </AppCard>
        ) : null}

        {activeTab === "security" ? (
          <AppCard padding="lg">
            <View style={{ gap: atomSpacing[5] }}>
              <View style={{ gap: atomSpacing[1] }}>
                <AppText variant="label">Account Security</AppText>
                <AppText tone="muted">Password settings</AppText>
              </View>

              <View style={{ gap: atomSpacing[4] }}>
                <View style={{ gap: atomSpacing[3] }}>
                  <Controller
                    control={passwordControl}
                    name="password"
                    render={({ field, fieldState }) => (
                      <TextField
                        autoCapitalize="none"
                        autoComplete="new-password"
                        errorText={fieldState.error?.message}
                        helperText={
                          !fieldState.error
                            ? "Use 8+ chars with uppercase, number, and symbol."
                            : null
                        }
                        label="New Password"
                        leftIcon={LockIcon}
                        onBlur={field.onBlur}
                        onChangeText={(value) => {
                          field.onChange(value);
                          setSecurityError(null);
                          setSecurityStatus(null);
                        }}
                        placeholder="new-password"
                        required
                        rightSlot={
                          <PasswordVisibilityToggle
                            onPress={() => {
                              setPasswordVisible((current) => !current);
                            }}
                            visible={passwordVisible}
                          />
                        }
                        size="md"
                        textContentType="newPassword"
                        type={passwordVisible ? "text" : "password"}
                        value={field.value}
                      />
                    )}
                  />

                  <Controller
                    control={passwordControl}
                    name="confirmPassword"
                    render={({ field, fieldState }) => (
                      <TextField
                        autoCapitalize="none"
                        autoComplete="new-password"
                        errorText={fieldState.error?.message}
                        label="Confirm Password"
                        leftIcon={LockIcon}
                        onBlur={field.onBlur}
                        onChangeText={(value) => {
                          field.onChange(value);
                          setSecurityError(null);
                          setSecurityStatus(null);
                        }}
                        placeholder="confirm-password"
                        required
                        rightSlot={
                          <PasswordVisibilityToggle
                            onPress={() => {
                              setConfirmPasswordVisible((current) => !current);
                            }}
                            visible={confirmPasswordVisible}
                          />
                        }
                        size="md"
                        textContentType="newPassword"
                        type={confirmPasswordVisible ? "text" : "password"}
                        value={field.value}
                      />
                    )}
                  />

                  <AppButton
                    isDisabled={!isPasswordChangeValid || isUpdatingPassword}
                    loading={isUpdatingPassword}
                    onPress={() => {
                      void changePassword();
                    }}
                    size="md"
                  >
                    Change Password
                  </AppButton>
                </View>
              </View>

              {securityStatus ? (
                <FieldMessage tone="success">{securityStatus}</FieldMessage>
              ) : null}
              {securityError ? (
                <FieldMessage tone="error">{securityError}</FieldMessage>
              ) : null}
            </View>
          </AppCard>
        ) : null}

        {activeTab === "methods" ? (
          <AppCard padding="lg">
            <View style={{ gap: atomSpacing[5] }}>
              <View style={{ gap: atomSpacing[1] }}>
                <AppText variant="label">Sign-In Methods</AppText>
                <AppText tone="muted">Connected access</AppText>
              </View>

              <View style={{ gap: atomSpacing[3] }}>
                <IdentityMethodRow
                  isLinked={linkedProviders.has("email")}
                  provider="email"
                />
                <IdentityMethodRow
                  isLinked={linkedProviders.has("google")}
                  provider="google"
                />
                <IdentityMethodRow
                  isLinked={linkedProviders.has("apple")}
                  provider="apple"
                />
              </View>

              {identityLoading ? (
                <FieldMessage>Checking linked methods...</FieldMessage>
              ) : null}
              {identityError ? (
                <FieldMessage tone="error">{identityError}</FieldMessage>
              ) : null}
            </View>
          </AppCard>
        ) : null}

        <AppButton
          icon={LogoutIcon}
          iconAfter={false}
          onPress={() => {
            void logOut();
          }}
          size="md"
          color="danger"
          variant="bordered"
        >
          Log Out
        </AppButton>
      </View>
    </Screen>
  );
}

function AvatarPicker({
  currentUrl,
  onChange,
  value
}: {
  currentUrl: string;
  onChange: (asset: ProfileAvatarAsset) => void;
  value: ProfileAvatarAsset | null;
}) {
  const previewUri = value?.uri ?? currentUrl.trim();

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.82
    });

    if (result.canceled || !result.assets[0]) {
      return;
    }

    const asset = result.assets[0];
    onChange({
      fileName: asset.fileName,
      mimeType: asset.mimeType,
      uri: asset.uri
    });
  };

  return (
    <Pressable
      accessibilityLabel="Change profile photo"
      accessibilityRole="button"
      onPress={() => {
        void pickImage();
      }}
      style={StyleSheet.flatten([
        profileStyles.avatarPicker,
        Platform.OS === "web" ? profileStyles.webCursor : null
      ])}
    >
      {previewUri ? (
        <Image
          contentFit="cover"
          source={{ uri: previewUri }}
          style={profileStyles.avatarImage}
        />
      ) : (
        <CameraIcon color={atomPalette.textSubtle} size="lg" />
      )}
      <View style={profileStyles.avatarPickerBadge}>
        <CameraIcon color={atomPalette.accentText} size="sm" />
      </View>
    </Pressable>
  );
}

const profileStyles = StyleSheet.create({
  avatarImage: {
    height: "100%",
    width: "100%"
  },
  avatarPicker: {
    alignItems: "center",
    backgroundColor: atomPalette.surfaceLow,
    borderColor: atomPalette.border,
    borderRadius: atomRadii.full,
    borderWidth: 1,
    height: 104,
    justifyContent: "center",
    overflow: "hidden",
    width: 104
  },
  avatarPickerBadge: {
    alignItems: "center",
    backgroundColor: atomPalette.accent,
    borderColor: atomPalette.surface,
    borderRadius: atomRadii.full,
    borderWidth: 2,
    bottom: 4,
    height: 32,
    justifyContent: "center",
    position: "absolute",
    right: 4,
    width: 32
  },
  webCursor: {
    cursor: "pointer"
  } as ViewStyle
});

function IdentityMethodRow({
  isLinked,
  provider
}: {
  isLinked: boolean;
  provider: IdentityProvider;
}) {
  const copy = providerCopy[provider];

  return (
    <View
      style={{
        alignItems: "center",
        borderColor: atomPalette.border,
        borderRadius: atomRadii.lg,
        borderWidth: 1,
        flexDirection: "row",
        gap: atomSpacing[3],
        justifyContent: "space-between",
        padding: atomSpacing[4]
      }}
    >
      <View
        style={{
          alignItems: "center",
          flex: 1,
          flexDirection: "row",
          gap: atomSpacing[3]
        }}
      >
        <ProviderIcon provider={provider} />
        <View style={{ flex: 1, gap: atomSpacing[1] }}>
          <AppText>{copy.label}</AppText>
          <AppText tone="muted" variant="bodySm">
            {copy.supporting}
          </AppText>
        </View>
      </View>

      {isLinked ? (
        <View
          style={{
            alignItems: "center",
            flexDirection: "row",
            gap: atomSpacing[1]
          }}
        >
          <CheckCircleIcon color={atomPalette.successText} size="sm" />
          <AppText tone="success" variant="label">
            Linked
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

function ProviderIcon({ provider }: { provider: IdentityProvider }) {
  if (provider === "google" || provider === "apple") {
    return (
      <Image
        source={provider === "google" ? googleLogo : appleLogo}
        style={{
          height: 24,
          resizeMode: "contain",
          width: 24
        }}
      />
    );
  }

  return <MailIcon color={atomPalette.textMuted} size="lg" />;
}
