import React from 'react';
import PostWizard from './PostWizard';

export default function SendInviteModal({
  isOpen,
  onClose,
  targetPost,
  currentUser,
  onSend,
  isSending
}) {
  return (
    <PostWizard
      isOpen={isOpen}
      onClose={onClose}
      targetPost={targetPost}
      mode="invite"
      currentUser={currentUser}
      onSendInvite={onSend}
      isSending={isSending}
    />
  );
}
