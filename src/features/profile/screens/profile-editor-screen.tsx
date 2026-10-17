import { CategoryChoice } from "@/features/onboarding/components/category-choice";
import type { CategoryStatus } from "@/features/profile/playing-category";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useNavigation, usePreventRemove } from "@react-navigation/native";
import { ArrowLeft } from "lucide-react-native";
import { OrganizerDetailsForm } from "../components/organizer-details-form";
import { getLinkedIdentities } from "../services/organizer-profile.service";
import {
  AppButton,
  AppCard,
  AppText,
  FieldMessage,
  AppHeading,
  PasswordVisibilityToggle,
  Screen,
  SegmentedTabs,
  TextField
} from "@/components/atoms";
import { atomPalette, atomRadii, atomSpacing } from "@/components/atoms/theme";
import { authCardMaxWidth } from "@/features/auth/components/auth-shell";
import { AuthContext } from "@/features/auth/auth-provider";
import {
  useUploadProfileAvatar,
  useDeleteUnusedProfileAvatar
} from "@/features/profile/hooks";
import type { ProfileAvatarAsset } from "@/features/profile/repositories/profile-avatar.repository";
import {
  profileInfoSchema,
  profilePasswordSchema,
  type ProfileInfoInput,
  type ProfilePasswordInput
} from "@/features/profile/validation";
import { updatePassword } from "@/features/auth/auth";
import { getSupabaseErrorMessage } from "@/lib/supabase";
import { zodResolver } from "@hookform/resolvers/zod";
import type { UserIdentity } from "@supabase/supabase-js";
import { Image } from "expo-image";
import { ProfilePhotoEditor } from "../components/profile-photo-editor";
import {
  CheckCircleIcon,
  LockIcon,
  MailIcon,
  PhoneIcon,
  UserIcon
} from "@/components/icons";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, StyleSheet, View } from "react-native";

const appleLogo = require("@assets/images/auth/apple-logo.png");
const googleLogo = require("@assets/images/auth/google-logo.png");

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
        playing_category?: number | null;
        category_status?: CategoryStatus;
        avatar?: string | null;
        bio?: string | null;
        first_name?: string | null;
        last_name?: string | null;
        phone_number?: string | null;
      }
    | null
    | undefined
): ProfileInfoInput {
  return {
    playingCategory: profile?.playing_category ?? null,
    categoryStatus: profile?.category_status ?? "unknown",
    avatar: profile?.avatar ?? "",
    bio: profile?.bio ?? "",
    firstName: profile?.first_name ?? "",
    lastName: profile?.last_name ?? "",
    phoneNumber: profile?.phone_number ?? ""
  };
}

export default function ProfileEditorScreen({
  section = "profile"
}: {
  section?: "profile" | "security";
}) {
  const router = useRouter();
  const { session, updateUserProfile, user } = useContext(AuthContext);
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
  const [activeTab, setActiveTab] = useState<ProfileTab>(section);
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const organizerMode =
    mode === "organizer" && user?.organizer_status === "active";
  const navigation = useNavigation();
  const [organizerDirty, setOrganizerDirty] = useState(false);
  const [organizerSaving, setOrganizerSaving] = useState(false);
  const uploadAvatarMutation = useUploadProfileAvatar();
  const cleanupAvatar = useDeleteUnusedProfileAvatar();
  const [pendingCleanup, setPendingCleanup] = useState<string[]>([]);
  const retryCleanup = async (urls = pendingCleanup) => {
    if (!user) return;
    const remaining: string[] = [];
    for (const url of urls) {
      try {
        await cleanupAvatar.mutateAsync({ url, userId: user.id });
      } catch {
        remaining.push(url);
      }
    }
    setPendingCleanup(remaining);
  };
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
    formState: { isValid: isPasswordChangeValid, isDirty: isPasswordDirty },
    handleSubmit: handlePasswordSubmit,
    reset: resetPasswordForm
  } = securityForm;
  const avatar = watchProfileField("avatar");
  const isProfileSaving = isSaving || uploadAvatarMutation.isPending;
  const isProfileSaveDisabled =
    isProfileSaving || !isProfileValid || (!isProfileDirty && !avatarAsset);

  usePreventRemove(
    !!user &&
      (organizerSaving ||
        isProfileSaving ||
        isUpdatingPassword ||
        (section === "profile"
          ? isProfileDirty || !!avatarAsset || organizerDirty
          : isPasswordDirty)),
    ({ data }) => {
      if (organizerSaving || isProfileSaving || isUpdatingPassword) return;
      Alert.alert("Discard changes?", "Your unsaved changes will be lost.", [
        { text: "Keep editing", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => navigation.dispatch(data.action)
        }
      ]);
    }
  );
  const linkedProviders = useMemo(() => {
    return new Set(
      identities.map((identity) => identity.provider.toLowerCase())
    );
  }, [identities]);

  const refreshIdentities = useCallback(async () => {
    if (!session) {
      setIdentities([]);
      return;
    }

    setIdentityLoading(true);
    setIdentityError(null);

    try {
      setIdentities(await getLinkedIdentities());
    } catch (error) {
      setIdentityError(getSupabaseErrorMessage(error));
    } finally {
      setIdentityLoading(false);
    }
  }, [session]);

  const profileDefaults = useMemo(() => getProfileInfoDefaults(user), [user]);
  useEffect(() => {
    setAvatarAsset(null);
    resetProfileForm(profileDefaults);
    resetPasswordForm({
      confirmPassword: "",
      password: ""
    });
    setFormError(null);
    setStatusMessage(null);
    setSecurityError(null);
    setSecurityStatus(null);
  }, [profileDefaults, resetProfileForm, resetPasswordForm]);

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
      const previousAvatar = user.avatar;
      const avatarUrl = avatarAsset
        ? await uploadAvatarMutation.mutateAsync({
            asset: avatarAsset,
            userId: user.id
          })
        : values.avatar;

      const updatedUser = await updateUserProfile({
        avatar: avatarUrl,
        ...(!organizerMode ? { bio: values.bio } : {}),
        first_name: values.firstName.trim(),
        last_name: values.lastName,
        phone_number: values.phoneNumber,
        playing_category: values.playingCategory,
        category_status: values.categoryStatus ?? "unknown"
      });

      if (updatedUser) {
        setAvatarAsset(null);
        resetProfileForm(getProfileInfoDefaults(updatedUser));
        setStatusMessage("Profile updated");
        if (previousAvatar && previousAvatar !== avatarUrl) {
          await retryCleanup([...new Set([...pendingCleanup, previousAvatar])]);
        }
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
    <Screen keyboardSafe scrollResetKey={activeTab}>
      <View
        style={{
          alignSelf: "center",
          gap: atomSpacing[5],
          maxWidth: section === "profile" ? 560 : authCardMaxWidth,
          width: "100%"
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <AppButton
            variant="ghost"
            layout="icon"
            icon={ArrowLeft}
            fullWidth={false}
            accessibilityLabel="Back to profile"
            onPress={() =>
              router.canGoBack()
                ? router.back()
                : router.replace(
                    user?.preferred_mode === "organizer"
                      ? "/(organizer)/organizer-profile"
                      : "/(player)/profile"
                  )
            }
          />
          <AppHeading variant="section" style={{ flex: 1 }}>
            {section === "profile" ? "Edit profile" : "Account & security"}
          </AppHeading>
        </View>
        {section === "security" && (
          <SegmentedTabs
            onChange={setActiveTab}
            options={profileTabs.filter((tab) => tab.value !== "profile")}
            value={activeTab}
          />
        )}

        {activeTab === "profile" ? (
          <AppCard padding="lg">
            <View style={{ gap: atomSpacing[5] }}>
              <View style={{ gap: atomSpacing[4] }}>
                <View
                  style={{
                    alignItems: "center",
                    gap: atomSpacing[3]
                  }}
                >
                  <ProfilePhotoEditor
                    currentUrl={avatar}
                    onChange={(asset) => {
                      setAvatarAsset(asset);
                      setFormError(null);
                      setStatusMessage(null);
                    }}
                    value={avatarAsset}
                    disabled={isProfileSaving || cleanupAvatar.isPending}
                    onRemove={() =>
                      Alert.alert(
                        "Remove profile photo?",
                        "Your photo will be removed when you save. Your initials will appear instead.",
                        [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Remove photo",
                            style: "destructive",
                            onPress: () => {
                              setAvatarAsset(null);
                              profileForm.setValue("avatar", "", {
                                shouldDirty: true,
                                shouldValidate: true
                              });
                              setStatusMessage(null);
                            }
                          }
                        ]
                      )
                    }
                  />
                  <AppText
                    tone="subtle"
                    variant="bodySm"
                    style={{ textAlign: "center" }}
                  >
                    Shared across your player and organizer profiles.
                  </AppText>
                </View>

                <View style={profileStyles.sectionDivider} />
                <View style={{ gap: 4 }}>
                  <AppHeading variant="card">Personal details</AppHeading>
                  <AppText tone="subtle" variant="bodySm">
                    How you introduce yourself on Palla.
                  </AppText>
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
                {!organizerMode && (
                  <Controller
                    control={profileControl}
                    name="bio"
                    render={({ field, fieldState }) => (
                      <TextField
                        label="About me"
                        placeholder="Tell other players a little about yourself…"
                        helperText="Optional · Up to 500 characters."
                        value={field.value}
                        onChangeText={(value) => {
                          field.onChange(value);
                          setFormError(null);
                        }}
                        onBlur={field.onBlur}
                        errorText={fieldState.error?.message}
                        multiline
                        maxLength={500}
                        editable={!isProfileSaving}
                        inputStyle={{
                          minHeight: 112,
                          textAlignVertical: "top"
                        }}
                      />
                    )}
                  />
                )}
                {!organizerMode && (
                  <>
                    <View style={profileStyles.sectionDivider} />
                    <View style={{ gap: 4 }}>
                      <AppHeading variant="card">Playing category</AppHeading>
                      <AppText tone="subtle" variant="bodySm">
                        Help organizers find the right games for you.
                      </AppText>
                    </View>
                    <Controller
                      control={profileControl}
                      name="categoryStatus"
                      render={({ field, fieldState }) => (
                        <View style={{ gap: atomSpacing[3] }}>
                          <CategoryChoice
                            status={field.value}
                            category={watchProfileField("playingCategory")}
                            disabled={isProfileSaving}
                            allowNotPlaying
                            onChange={(status, category) => {
                              field.onChange(status);
                              profileForm.setValue(
                                "playingCategory",
                                category,
                                {
                                  shouldValidate: true,
                                  shouldDirty: true
                                }
                              );
                            }}
                          />
                          {fieldState.error ? (
                            <FieldMessage tone="error">
                              {fieldState.error.message}
                            </FieldMessage>
                          ) : null}
                          {profileForm.formState.errors.playingCategory ? (
                            <FieldMessage tone="error">
                              {
                                profileForm.formState.errors.playingCategory
                                  .message
                              }
                            </FieldMessage>
                          ) : null}
                        </View>
                      )}
                    />
                  </>
                )}
              </View>

              <View style={{ gap: atomSpacing[3] }}>
                <AppButton
                  color="essential"
                  isDisabled={isProfileSaveDisabled}
                  loading={isProfileSaving}
                  onPress={() => {
                    void saveProfile();
                  }}
                  size="md"
                >
                  Save changes
                </AppButton>

                {statusMessage ? (
                  <FieldMessage tone="success">{statusMessage}</FieldMessage>
                ) : null}
                {formError ? (
                  <FieldMessage tone="error">{formError}</FieldMessage>
                ) : null}
                {pendingCleanup.length > 0 && (
                  <View style={{ gap: 8 }}>
                    <FieldMessage>
                      Your profile is saved, but the previous photo couldn’t be
                      deleted.
                    </FieldMessage>
                    <AppButton
                      variant="ghost"
                      loading={cleanupAvatar.isPending}
                      onPress={() => void retryCleanup()}
                    >
                      Retry photo cleanup
                    </AppButton>
                  </View>
                )}
              </View>
            </View>
          </AppCard>
        ) : null}

        {activeTab === "profile" && organizerMode && (
          <OrganizerDetailsForm
            id={user?.id}
            onDirtyChange={setOrganizerDirty}
            onSavingChange={setOrganizerSaving}
          />
        )}

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
      </View>
    </Screen>
  );
}

const profileStyles = StyleSheet.create({
  sectionDivider: {
    height: 1,
    backgroundColor: atomPalette.borderSubtle,
    marginVertical: 4
  }
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
