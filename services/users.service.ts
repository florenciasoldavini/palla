// import { supabase } from "@/lib/supabase";
// import { Session, User } from "@supabase/supabase-js";

// /**
//  * @function createUser
//  * @param {User} userData - The user data to create
//  * @description Creates a new user in the database
//  * @returns {Promise<void>} void
//  */
// export const createUser = async (userData: User) => {
//   const { data, error } = await supabase
//     .from("users")
//     .insert({
//       ...userData,
//       email: userData.email
//     })
//     .select();

//   if (error) {
//     return console.error(error);
//   }

//   const user = data?.[0] as User;
//   return user;
// };

// /**
//  * @function getUser
//  * @param {Session} session - The session object
//  * @description Gets the user data for a session
//  * @returns {Promise<{user: User | null, docId: string | null}>} user and docId or null if not found
//  */
// export const getUser = async () => {
//   const { data, error } = await supabase
//     .from("users")
//     .select("*")
//     .eq("email", session.user.email);

//   if (error) {
//     return console.error(error);
//   }

//   const user = data?.[0] as User;
//   return user;
// };
