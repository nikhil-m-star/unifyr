const { clerkClient } = require('@clerk/express');
const userModel = require('../models/userModel');

const getFallbackEmail = (clerkId) => `${clerkId}@users.unifyr.local`;

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
  if (existingUser) {
    return existingUser;
  }

  let profile = getProfileFromClaims(claims);

  try {
    const clerkUser = await clerkClient.users.getUser(clerkId);
    profile = {
      ...profile,
      ...getProfileFromClerkUser(clerkUser),
    };
  } catch (error) {
    console.warn(`Unable to hydrate Clerk profile for ${clerkId}: ${error.message}`);
  }

  const normalizedEmail = profile.email || getFallbackEmail(clerkId);

  return userModel.createUser(clerkId, profile.name || 'User', normalizedEmail, profile.profilePic || '');
};

module.exports = {
  syncUserFromClerk,
};
