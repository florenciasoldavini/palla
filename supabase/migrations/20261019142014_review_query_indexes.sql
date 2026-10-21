-- Cover catalog/moderation references and the scheduled completion scan.
create index notification_preferences_type on private.notification_preferences(notification_type);
create index app_notifications_type on private.app_notifications(notification_type);
create index review_reports_moderator on private.review_reports(moderator_id);
create index review_moderation_log_moderator on private.review_moderation_log(moderator_id);
create index sessions_pending_completion on public.sessions(ends_at) where status='published';
