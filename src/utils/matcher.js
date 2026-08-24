/**
 * TEAMUP Priority Matchmaking Engine for Fortnite
 * Evaluates real-time teammate requests in strict priority order:
 * 1. Region Match (35%)
 * 2. Mode Hierarchy: Main Mode (15%) + Subtype/Build (10%) + Team Size (10%)
 * 3. Platform Match (15%)
 * 4. Voice Mic Match (10%)
 * 5. Language Match: Primary & Secondary (5%)
 */

export function evaluateRequest(post, filters) {
  let score = 0;
  const matchTags = [];

  if (post.region === filters.region) {
    score += 35;
    matchTags.push({ text: post.region, icon: 'Globe', matched: true });
  } else {
    matchTags.push({ text: post.region, icon: 'Globe', matched: false });
  }

  if (post.mainMode === filters.mainMode) {
    score += 15;

    if (filters.mainMode === 'Creative') {
      if (post.creativeType === filters.creativeType) {
        score += 10;
        matchTags.push({ text: `Creative: ${post.creativeType}`, icon: 'Box', matched: true });
      } else {
        matchTags.push({ text: `Creative: ${post.creativeType}`, icon: 'Box', matched: false });
      }
    } else {
      if (post.buildType === filters.buildType) {
        score += 10;
        matchTags.push({ text: `${post.mainMode} (${post.buildType})`, icon: 'Trophy', matched: true });
      } else {
        matchTags.push({ text: `${post.mainMode} (${post.buildType})`, icon: 'Trophy', matched: false });
      }
    }

    if (post.teamSize === filters.teamSize) {
      score += 10;
      matchTags.push({ text: post.teamSize, icon: 'Users', matched: true });
    } else {
      matchTags.push({ text: post.teamSize, icon: 'Users', matched: false });
    }
  } else {
    const modeLabel = post.mainMode === 'Creative'
      ? `${post.mainMode} (${post.creativeType}) • ${post.teamSize}`
      : `${post.mainMode} (${post.buildType}) • ${post.teamSize}`;
    matchTags.push({ text: modeLabel, icon: 'Trophy', matched: false });
  }

  if (filters.platform === 'Any' || post.platform === filters.platform) {
    score += 15;
    matchTags.push({ text: post.platform, icon: 'Gamepad2', matched: true });
  } else if (
    (filters.platform === 'PlayStation' && post.platform === 'Xbox') ||
    (filters.platform === 'Xbox' && post.platform === 'PlayStation')
  ) {
    score += 12;
    matchTags.push({ text: `Console: ${post.platform}`, icon: 'Gamepad2', matched: true });
  } else {
    score += 5;
    matchTags.push({ text: post.platform, icon: 'Gamepad2', matched: false });
  }

  if (filters.mic === 'Yes') {
    if (post.hasMic) {
      score += 10;
      matchTags.push({ text: 'Mic Ready', icon: 'Mic', matched: true, isMic: true });
    } else {
      matchTags.push({ text: 'No Mic', icon: 'MicOff', matched: false, isMic: true });
    }
  } else if (filters.mic === 'No') {
    if (!post.hasMic) {
      score += 10;
      matchTags.push({ text: 'No Mic', icon: 'MicOff', matched: true, isMic: true });
    } else {
      score += 5;
      matchTags.push({ text: 'Has Mic', icon: 'Mic', matched: false, isMic: true });
    }
  } else {
    score += 10;
    matchTags.push({ text: post.hasMic ? 'Mic Ready' : 'No Mic', icon: post.hasMic ? 'Mic' : 'MicOff', matched: true, isMic: true });
  }

  let langMatched = false;
  if (post.langPrimary === filters.langPrimary || post.langSecondary === filters.langPrimary) {
    score += 5;
    langMatched = true;
  } else if (
    filters.langSecondary !== 'None' &&
    (post.langPrimary === filters.langSecondary || post.langSecondary === filters.langSecondary)
  ) {
    score += 4;
    langMatched = true;
  } else if (post.langPrimary === 'English' || filters.langPrimary === 'English') {
    score += 2;
  }

  const langText = post.langSecondary && post.langSecondary !== 'None'
    ? `${post.langPrimary} / ${post.langSecondary}`
    : post.langPrimary;

  matchTags.push({ text: langText, icon: 'Languages', matched: langMatched });

  const matchPercentage = Math.min(100, Math.round(score));

  let badgeClass = 'badge-low';
  let badgeText = `${matchPercentage}% Match`;

  if (matchPercentage === 100) {
    badgeClass = 'badge-100';
    badgeText = '100% PERFECT MATCH';
  } else if (matchPercentage >= 80) {
    badgeClass = 'badge-high';
    badgeText = `${matchPercentage}% STRONG MATCH`;
  } else if (matchPercentage >= 55) {
    badgeClass = 'badge-medium';
    badgeText = `${matchPercentage}% GOOD MATCH`;
  }

  return {
    ...post,
    matchScore: score,
    matchPercentage,
    badgeClass,
    badgeText,
    matchTags
  };
}

export function rankRequests(requests, filters, currentUser) {
  const userAge = currentUser ? (currentUser.age || 18) : 18;
  const isAdult = userAge >= 18;
  const currentUserId = currentUser?.id || currentUser?._id;

  const scored = requests.map(r => {
    const evaluated = evaluateRequest(r, filters);
    const rAge = r.userAge || 18;
    const rIsAdult = rAge >= 18;
    if (isAdult === rIsAdult) {
      evaluated.matchScore += 5;
    }
    return evaluated;
  });

  scored.sort((a, b) => {
    const aIsMe = currentUserId && (a.userId === currentUserId);
    const bIsMe = currentUserId && (b.userId === currentUserId);
    if (aIsMe && !bIsMe) return -1;
    if (!aIsMe && bIsMe) return 1;

    if (b.matchScore !== a.matchScore) {
      return b.matchScore - a.matchScore;
    }
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  });

  return scored;
}
