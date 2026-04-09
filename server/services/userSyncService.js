const { clerkClient } = require('@clerk/express');
const userModel = require('../models/userModel');

const getFallbackEmail = (clerkId) => `${clerkId}@users.unifyr.local`;
const adminEmails = (process.env.ADMIN_EMAILS || 'nikhilm.cs24@bmsce.ac.in, nikhilm9110@gmail.com')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

const isAdminEmail = (email = '') => adminEmails.includes(email.trim().toLowerCase());

const getProfileFromClaims = (claims = {}) => {
  const fullName = claims.fullName || claims.full_name || claims.name;
  const firstName = claims.firstName || claims.first_name || claims.given_name;
  const lastName = claims.lastName || claims.last_name || claims.family_name;

  return {
    name: fullName || [firstName, lastName].filter(Boolean).join(' ') || 'User',
    email: claims.primaryEmail || claims.primary_email || claims.email || '',
    profilePic: claims.imageUrl || claims.image_url || claims.picture || '',
  };
};

const getProfileFromClerkUser = (clerkUser) => {
  const primaryEmail = clerkUser?.primaryEmailAddress?.emailAddress
    || clerkUser?.emailAddresses?.find((address) => address.id === clerkUser.primaryEmailAddressId)?.emailAddress
    || '';

  return {
    name: clerkUser?.fullName
      || [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(' ')
      || clerkUser?.username
      || 'User',
    email: primaryEmail,
    profilePic: clerkUser?.imageUrl || clerkUser?.profileImageUrl || '',
  };
};

const syncUserFromClerk = async (clerkId, claims = {}) => {
  if (!clerkId) {
    throw new Error('Clerk user ID is required');
  }

  const existingUser = await userModel.getUserByClerkId(clerkId);

  let profile = getProfileFromClaims(claims);
  const shouldHydrateFromClerk = !existingUser || !profile.email || !profile.name || !profile.profilePic;

  if (shouldHydrateFromClerk) {
    try {
      const clerkUser = await clerkClient.users.getUser(clerkId);
      profile = {
        ...profile,
        ...getProfileFromClerkUser(clerkUser),
      };
    } catch (error) {
      console.warn(`Unable to hydrate Clerk profile for ${clerkId}: ${error.message}`);
    }
  }

  const normalizedEmail = profile.email || getFallbackEmail(clerkId);

  const isBmsceEmail = normalizedEmail.endsWith('@bmsce.ac.in');
  const isFallbackEmail = normalizedEmail.endsWith('.local');
  const isAdmin = isAdminEmail(normalizedEmail);
  const isDev = process.env.NODE_ENV === 'development';

  // Enforce BMSCE domain restriction for all users except existing ones, admins, and local fallbacks
  // In development, we allow all emails to facilitate testing
  if (!isBmsceEmail && !isFallbackEmail && !isAdmin && !isDev && clerkId.startsWith('user_')) {
    const error = new Error('Access restricted to bmsce.ac.in institutional emails only.');
    error.status = 403;
    throw error;
  }

  const role = isAdminEmail(normalizedEmail) ? 'admin' : (existingUser?.role || 'student');

  return userModel.createUser(
    clerkId,
    profile.name || existingUser?.name || 'User',
    normalizedEmail,
    profile.profilePic || existingUser?.profile_pic || '',
    role
  );
};

module.exports = {
  syncUserFromClerk,
};
