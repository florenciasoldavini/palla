-- A NULL address must not turn the address-snapshot CHECK into SQL UNKNOWN.
alter table public.venues add constraint venues_coordinate_address_present
  check (latitude is null or address is not null);
