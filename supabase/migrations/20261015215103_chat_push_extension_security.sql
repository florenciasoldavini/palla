-- Private push state is accessible only to the delivery worker; clients use actor-scoped RPCs.
create policy chat_push_devices_service on private.chat_push_devices to service_role using(true) with check(true);
create policy chat_push_jobs_service on private.chat_push_jobs to service_role using(true) with check(true);
