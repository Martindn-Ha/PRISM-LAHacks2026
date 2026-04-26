// @ts-nocheck
import { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Share, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { CHALLENGE_FILTERS, GOALS_TABS } from '../constants/appNavigation';
import { COMMUNITY_ACTIONS, COMMUNITY_OVERVIEW_DESCRIPTION } from '../constants/community';
import { COMMUNITY_SPOTLIGHT_IMAGE_URL } from '../config/publicEnv';
import { formatEventSourceName } from '../utils/format';
import type { InviteContact } from '../types/experience';
import { styles } from '../styles/appStyles';

type Props = any;

export default function GoalsScreen(props: Props) {
  const [selectedChallengeDetail, setSelectedChallengeDetail] = useState<any | null>(null);
  const {
    goalsTab, setGoalsTab, isInteractingWithEventsList, selectedJoinedCommunity, setSelectedJoinedCommunityName,
    showOverviewPopup, setShowOverviewPopup, selectedCommunityAction, setSelectedCommunityAction, openInviteContacts,
    selectedCommunityShareLink, showInvitePopup, setShowInvitePopup, loadingInviteContacts, inviteContacts, inviteContactBySms,
    eventsTab, setEventsTab, setIsInteractingWithEventsList, loadingCommunityEvents, displayedEvents, openEventLinkPrompt,
    openCreateProgressPostModal, progressPostsForSelectedCommunity, joinedCommunities, challengeFilter, setChallengeFilter,
    setShowCreatePersonalChallengeModal, filteredChallenges, communitySearchQuery, setCommunitySearchQuery, filteredCommunities,
    joinedCommunityNames, setJoinedCommunityNames,
  } = props;
  return (
        <View style={styles.goalsScreen}>
          <Text style={styles.goalsTitle}>Goals</Text>
          <Text style={styles.goalsSubtitle}>Track progress across communities, events, and personal challenges.</Text>
          <View style={styles.goalsTabRow}>
            {GOALS_TABS.map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setGoalsTab(tab)}
                style={[styles.goalsTab, goalsTab === tab && styles.goalsTabActive]}
              >
                <Text style={[styles.goalsTabText, goalsTab === tab && styles.goalsTabTextActive]}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {goalsTab === 'Active' ? (
            <ScrollView
              bounces={false}
              overScrollMode="never"
              showsVerticalScrollIndicator={false}
              style={styles.goalsScroll}
              scrollEnabled={!isInteractingWithEventsList}
            >
              {selectedJoinedCommunity ? (
                <View>
                  <View style={styles.communityHero}>
                    {COMMUNITY_SPOTLIGHT_IMAGE_URL ? (
                      <>
                        <Image source={{ uri: COMMUNITY_SPOTLIGHT_IMAGE_URL }} style={styles.communityHeroImage} resizeMode="cover" />
                        <View style={styles.communityHeroScrim} />
                      </>
                    ) : null}
                    <View style={styles.communityHeroActions}>
                      <TouchableOpacity onPress={() => setSelectedJoinedCommunityName(null)} style={styles.communityHeroIconBtn}>
                        <Text style={styles.communityHeroIconText}>{'<'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.communityHeroIconBtn}>
                        <Text style={styles.communityHeroIconText}>⚙</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.communityHeroTag}>Community Spotlight</Text>
                  </View>
                  <View style={styles.communityDetailCard}>
                    <Text style={styles.communityDetailTitle}>{selectedJoinedCommunity.name}</Text>
                    <Text style={styles.communityDetailMeta}>Multisport • {selectedJoinedCommunity.members} • Public</Text>
                    <Text style={styles.communityDetailSub}>Built for daily progress and mutual accountability.</Text>
                    <View style={styles.communityActionsRow}>
                      {COMMUNITY_ACTIONS.map((action) => (
                        <View key={action.label} style={styles.communityActionItem}>
                          <TouchableOpacity
                            onPress={() => {
                              if (action.label === 'Overview') {
                                setShowOverviewPopup(true);
                                setSelectedCommunityAction('Progress Board');
                                return;
                              }
                              if (action.label === 'Invite') {
                                setShowOverviewPopup(false);
                                void openInviteContacts();
                                setSelectedCommunityAction('Progress Board');
                                return;
                              }
                              if (action.label === 'Share' && selectedJoinedCommunity && selectedCommunityShareLink) {
                                void Share.share({
                                  message: `Join me in ${selectedJoinedCommunity.name} on Connected Wellness: ${selectedCommunityShareLink}`,
                                  url: selectedCommunityShareLink,
                                  title: `Share ${selectedJoinedCommunity.name}`,
                                });
                                setShowOverviewPopup(false);
                                setSelectedCommunityAction('Progress Board');
                                return;
                              }
                              setShowOverviewPopup(false);
                              setSelectedCommunityAction(action.label);
                            }}
                            style={[
                              styles.communityActionIconBtn,
                              selectedCommunityAction === action.label && styles.communityActionIconBtnActive,
                            ]}
                          >
                            <Text style={styles.communityActionIcon}>{action.icon}</Text>
                          </TouchableOpacity>
                          <Text style={styles.communityActionLabel}>{action.label}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  <Modal
                    animationType="fade"
                    onRequestClose={() => setShowOverviewPopup(false)}
                    transparent
                    visible={showOverviewPopup}
                  >
                    <Pressable onPress={() => setShowOverviewPopup(false)} style={styles.communityOverviewBackdrop}>
                      <Pressable onPress={() => {}} style={styles.communityOverviewPopup}>
                        <View style={styles.communityOverviewPopupHeader}>
                          <Text style={styles.communityOverviewPopupTitle}>Community Overview</Text>
                          <TouchableOpacity onPress={() => setShowOverviewPopup(false)} style={styles.communityOverviewCloseBtn}>
                            <Text style={styles.communityOverviewCloseText}>×</Text>
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.communityOverviewPopupText}>
                          {selectedJoinedCommunity.name} is based in {selectedJoinedCommunity.city}. {COMMUNITY_OVERVIEW_DESCRIPTION}
                        </Text>
                      </Pressable>
                    </Pressable>
                  </Modal>
                  <Modal
                    animationType="fade"
                    onRequestClose={() => setShowInvitePopup(false)}
                    transparent
                    visible={showInvitePopup}
                  >
                    <Pressable onPress={() => setShowInvitePopup(false)} style={styles.communityOverviewBackdrop}>
                      <Pressable onPress={() => {}} style={styles.communityOverviewPopup}>
                        <View style={styles.communityOverviewPopupHeader}>
                          <Text style={styles.communityOverviewPopupTitle}>Invite Contacts</Text>
                          <TouchableOpacity onPress={() => setShowInvitePopup(false)} style={styles.communityOverviewCloseBtn}>
                            <Text style={styles.communityOverviewCloseText}>×</Text>
                          </TouchableOpacity>
                        </View>
                        {loadingInviteContacts ? (
                          <Text style={styles.communityOverviewPopupText}>Loading contacts...</Text>
                        ) : (
                          <ScrollView bounces={false} overScrollMode="never" showsVerticalScrollIndicator={false} style={styles.inviteContactsList}>
                            {inviteContacts.map((contact: InviteContact) => (
                              <View key={contact.id} style={styles.inviteContactRow}>
                                <View style={styles.inviteContactInfo}>
                                  <Text style={styles.inviteContactName}>{contact.name}</Text>
                                  <Text style={styles.inviteContactPhone}>{contact.phone ?? 'No phone number'}</Text>
                                </View>
                                <TouchableOpacity onPress={() => void inviteContactBySms(contact)} style={styles.inviteContactBtn}>
                                  <Text style={styles.inviteContactBtnText}>Invite</Text>
                                </TouchableOpacity>
                              </View>
                            ))}
                          </ScrollView>
                        )}
                      </Pressable>
                    </Pressable>
                  </Modal>
                  {selectedCommunityAction === 'Events' ? (
                    <View>
                      <Text style={styles.progressBoardTitle}>Events</Text>
                      <View style={styles.eventsTabRow}>
                        {(['Upcoming', 'Past'] as const).map((tab) => (
                          <TouchableOpacity
                            key={tab}
                            onPress={() => setEventsTab(tab)}
                            style={[styles.eventsTabBtn, eventsTab === tab && styles.eventsTabBtnActive]}
                          >
                            <Text style={[styles.eventsTabText, eventsTab === tab && styles.eventsTabTextActive]}>{tab}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      <View
                        onTouchCancel={() => setIsInteractingWithEventsList(false)}
                        onTouchEnd={() => setIsInteractingWithEventsList(false)}
                        onTouchStart={() => setIsInteractingWithEventsList(true)}
                        style={styles.eventsListContainer}
                      >
                        {loadingCommunityEvents ? (
                          <Text style={styles.eventsLoadingText}>Loading live events...</Text>
                        ) : null}
                        {displayedEvents.length === 0 && !loadingCommunityEvents ? (
                          <Text style={styles.eventsEmptyText}>No live events found for this tab yet.</Text>
                        ) : (
                          <ScrollView bounces={false} nestedScrollEnabled overScrollMode="never" showsVerticalScrollIndicator={false}>
                            {displayedEvents.map((event, index, arr) => (
                              <View key={`${selectedJoinedCommunity.name}-${event.id}`}>
                                <TouchableOpacity activeOpacity={0.85} onPress={() => openEventLinkPrompt(event)} style={styles.eventRow}>
                                  <View style={styles.eventDateCol}>
                                    <Text style={styles.eventDateMonth}>{event.month}</Text>
                                    <Text style={styles.eventDateDay}>{event.day}</Text>
                                    <Text style={styles.eventDateDow}>{event.dow}</Text>
                                  </View>
                                  <View style={styles.eventInfoCol}>
                                    <Text style={styles.eventTitle}>{event.title}</Text>
                                    <Text style={styles.eventMeta}>{event.meta}</Text>
                                    <Text
                                      style={[
                                        styles.eventRsvp,
                                        (event.source ?? 'ticketmaster').toLowerCase() === 'eventbrite'
                                          ? styles.eventSourceEventbrite
                                          : styles.eventSourceTicketmaster,
                                      ]}
                                    >
                                      {`${formatEventSourceName(event.source)}: `}
                                      <Text style={eventsTab === 'Upcoming' ? styles.eventStatusLive : styles.eventStatusPassed}>
                                        {eventsTab === 'Upcoming' ? 'Live' : 'Passed'}
                                      </Text>
                                    </Text>
                                  </View>
                                </TouchableOpacity>
                                {index < arr.length - 1 ? <View style={styles.eventDivider} /> : null}
                              </View>
                            ))}
                          </ScrollView>
                        )}
                      </View>
                    </View>
                  ) : (
                    <View>
                      <View style={styles.progressBoardHeader}>
                        <Text style={styles.progressBoardTitle}>Progress Board</Text>
                        <TouchableOpacity onPress={openCreateProgressPostModal} style={styles.createPostBtn}>
                          <Text style={styles.createPostBtnText}>+ Create Post</Text>
                        </TouchableOpacity>
                      </View>
                      {progressPostsForSelectedCommunity.map((post) => (
                        <View key={`${selectedJoinedCommunity.name}-${post.id}`} style={styles.progressPostCard}>
                          <View style={styles.progressPostHeader}>
                            <Text style={styles.progressPostAuthor}>{post.author}</Text>
                            <Text style={styles.progressPostTime}>{post.time}</Text>
                          </View>
                          <Text style={styles.progressPostCaption}>{post.caption}</Text>
                          {post.status !== 'ready' ? (
                            <Text style={styles.progressPostStatus}>
                              {post.status === 'processing' ? 'Analyzing image...' : 'Upload failed. Tap Create Post to retry.'}
                            </Text>
                          ) : null}
                          <View style={styles.progressPostImage}>
                            {post.imageUrl ? (
                              <Image
                                resizeMode="cover"
                                source={{ uri: post.mediaVariants?.feedUrl ?? post.imageUrl }}
                                style={styles.progressPostImageActual}
                              />
                            ) : (
                              <Text style={styles.progressPostImageText}>{post.imageLabel}</Text>
                            )}
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ) : joinedCommunities.length === 0 ? (
                <View style={styles.goalsCard}>
                  <Text style={styles.goalsCardTitle}>No joined communities yet</Text>
                  <Text style={styles.goalsCardDetail}>Go to Communities and press Join to add one here.</Text>
                </View>
              ) : (
                joinedCommunities.map((community) => (
                  <TouchableOpacity key={community.name} onPress={() => setSelectedJoinedCommunityName(community.name)} style={styles.goalsCard}>
                    <Text style={styles.goalsCardTitle}>{community.name}</Text>
                    <Text style={styles.goalsCardDetail}>{community.city}</Text>
                    <Text style={styles.goalsCardMeta}>{`Joined • ${community.members}`}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          ) : null}
          {goalsTab === 'Challenges' ? (
            <ScrollView bounces={false} overScrollMode="never" showsVerticalScrollIndicator={false} style={styles.goalsScroll}>
              <View style={styles.challengeSummaryCard}>
                <Text style={styles.challengeSummaryTitle}>Challenge Center</Text>
                <Text style={styles.challengeSummaryText}>
                  {filteredChallenges.length} active {challengeFilter.toLowerCase()} challenge{filteredChallenges.length === 1 ? '' : 's'}
                </Text>
              </View>
              <View style={styles.challengeFilterRow}>
                {CHALLENGE_FILTERS.map((filter) => (
                  <TouchableOpacity
                    key={filter}
                    onPress={() => setChallengeFilter(filter)}
                    style={[styles.challengeFilterTab, challengeFilter === filter && styles.challengeFilterTabActive]}
                  >
                    <Text style={[styles.challengeFilterText, challengeFilter === filter && styles.challengeFilterTextActive]}>{filter}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {challengeFilter === 'Personal' ? (
                <TouchableOpacity onPress={() => setShowCreatePersonalChallengeModal(true)} style={styles.createPersonalChallengeBtn}>
                  <Text style={styles.createPersonalChallengeBtnText}>+ Create Personal Challenge</Text>
                </TouchableOpacity>
              ) : null}
              {filteredChallenges.map((c, index) => (
                <View key={`${c.type}-${c.title}-${index}`} style={styles.challengeTimelineRow}>
                  <View style={styles.challengeTimelineRail}>
                    <View
                      style={[
                        styles.challengeTimelineNode,
                        c.type === 'community' ? styles.challengeTimelineNodeCommunity : styles.challengeTimelineNodePersonal,
                      ]}
                    />
                    {index < filteredChallenges.length - 1 ? <View style={styles.challengeTimelineLine} /> : null}
                  </View>
                  <View
                    style={[
                      styles.challengeTimelineContent,
                      c.type === 'community' ? styles.challengeTimelineContentCommunity : styles.challengeTimelineContentPersonal,
                    ]}
                  >
                    <View style={styles.challengeHeaderRow}>
                      <Text style={[styles.challengeTypeBadge, c.type === 'community' ? styles.challengeTypeCommunity : styles.challengeTypePersonal]}>
                        {c.type === 'community' ? 'Community Challenge' : 'Personal Challenge'}
                      </Text>
                      <Text style={styles.challengeMembersPill}>{c.members}</Text>
                    </View>
                    <Text numberOfLines={2} style={styles.goalsCardTitle}>{c.title}</Text>
                    <Text numberOfLines={3} style={styles.goalsCardDetail}>{c.detail}</Text>
                    <View style={styles.challengeChipRow}>
                      {c.type === 'community' ? (
                        <View style={styles.challengeChip}>
                          <Text style={styles.challengeChipText}>Team Goal</Text>
                        </View>
                      ) : null}
                      <View style={[styles.challengeChip, styles.challengeChipMuted]}>
                        <Text style={styles.challengeChipText}>7-day streak</Text>
                      </View>
                      <View style={[styles.challengeChip, styles.challengeChipMuted]}>
                        <Text style={styles.challengeChipText}>High impact</Text>
                      </View>
                    </View>
                    <View style={styles.challengeProgressRow}>
                      <View style={styles.challengeProgressTrack}>
                        <View
                          style={[
                            styles.challengeProgressFill,
                            { width: c.type === 'community' ? '72%' : '48%' },
                          ]}
                        />
                      </View>
                      <Text style={styles.challengeProgressLabel}>{c.type === 'community' ? '72%' : '48%'}</Text>
                    </View>
                    <View style={styles.challengeCardFooter}>
                      <Text style={styles.goalsCardMeta}>Momentum rising</Text>
                      <TouchableOpacity onPress={() => setSelectedChallengeDetail(c)} style={styles.challengeQuickActionBtn}>
                        <Text style={styles.challengeQuickActionText}>Open</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
              <Modal
                animationType="fade"
                onRequestClose={() => setSelectedChallengeDetail(null)}
                transparent
                visible={selectedChallengeDetail != null}
              >
                <Pressable onPress={() => setSelectedChallengeDetail(null)} style={styles.challengeDetailBackdrop}>
                  <Pressable onPress={() => {}} style={styles.challengeDetailModal}>
                    {selectedChallengeDetail ? (
                      <>
                        <View style={styles.challengeDetailHeader}>
                          <Text style={styles.challengeDetailTitle}>Challenge Details</Text>
                          <TouchableOpacity onPress={() => setSelectedChallengeDetail(null)} style={styles.challengeDetailCloseBtn}>
                            <Text style={styles.challengeDetailCloseText}>×</Text>
                          </TouchableOpacity>
                        </View>
                        <View style={styles.challengeDetailChips}>
                          <Text
                            style={[
                              styles.challengeTypeBadge,
                              selectedChallengeDetail.type === 'community' ? styles.challengeTypeCommunity : styles.challengeTypePersonal,
                            ]}
                          >
                            {selectedChallengeDetail.type === 'community' ? 'Community Challenge' : 'Personal Challenge'}
                          </Text>
                          <Text style={styles.challengeMembersPill}>{selectedChallengeDetail.members}</Text>
                        </View>
                        <Text style={styles.challengeDetailName}>{selectedChallengeDetail.title}</Text>
                        <Text style={styles.challengeDetailText}>{selectedChallengeDetail.detail}</Text>
                        <View style={styles.challengeProgressRow}>
                          <View style={styles.challengeProgressTrack}>
                            <View
                              style={[
                                styles.challengeProgressFill,
                                { width: selectedChallengeDetail.type === 'community' ? '72%' : '48%' },
                              ]}
                            />
                          </View>
                          <Text style={styles.challengeProgressLabel}>{selectedChallengeDetail.type === 'community' ? '72%' : '48%'}</Text>
                        </View>
                        <View style={styles.challengeDetailActions}>
                          <TouchableOpacity onPress={() => setSelectedChallengeDetail(null)} style={styles.challengeDetailDismissBtn}>
                            <Text style={styles.challengeDetailDismissText}>Close</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => setSelectedChallengeDetail(null)} style={styles.challengeDetailPrimaryBtn}>
                            <Text style={styles.challengeDetailPrimaryText}>Mark Check-In</Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    ) : null}
                  </Pressable>
                </Pressable>
              </Modal>
            </ScrollView>
          ) : null}
          {goalsTab === 'Communities' ? (
            <ScrollView bounces={false} overScrollMode="never" showsVerticalScrollIndicator={false} style={styles.goalsScroll}>
              <View style={styles.communitySearchBar}>
                <TextInput
                  onChangeText={setCommunitySearchQuery}
                  placeholder="Search communities, city, or focus area"
                  placeholderTextColor="#6b7280"
                  style={styles.communitySearchText}
                  value={communitySearchQuery}
                />
              </View>
              <Text style={styles.communitySectionTitle}>Popular communities near you</Text>
              <View style={styles.communityGrid}>
                {filteredCommunities.map((community) => (
                  <View key={community.name} style={styles.communityCard}>
                    <Text style={styles.communityCardBadge}>●</Text>
                    <Text style={styles.communityCardTitle}>{community.name}</Text>
                    <Text style={styles.communityCardMeta}>{community.city}</Text>
                    <Text style={styles.communityCardMeta}>{community.members}</Text>
                    <TouchableOpacity
                      onPress={() =>
                        setJoinedCommunityNames((prev: string[]) =>
                          prev.includes(community.name) ? prev : [...prev, community.name],
                        )
                      }
                      style={styles.communityJoinBtn}
                    >
                      <Text style={styles.communityJoinText}>
                        {joinedCommunityNames.includes(community.name) ? 'Joined' : 'Join'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
                {filteredCommunities.length === 0 ? (
                  <View style={styles.goalsCard}>
                    <Text style={styles.goalsCardTitle}>No communities found</Text>
                    <Text style={styles.goalsCardDetail}>Try a different name or city in search.</Text>
                  </View>
                ) : null}
              </View>
            </ScrollView>
          ) : null}
        </View>
  );
}
