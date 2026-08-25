import React from 'react';
import { Copy, Trash2, Globe, Trophy, Gamepad2, Mic, MicOff, Languages, Zap, MessageSquare, Crown } from 'lucide-react';
import { useTimeAgo } from '../utils/timeAgo';

export default function PlayerCard({
  post,
  isMyPost,
  onMatchPlayer,
  onCopyGamerTag,
  onCopyPsn,
  onCopyXbox,
  onCopyDiscord,
  onDeletePost,
  hasIncoming
}) {
  const timestamp = post.createdAt || (post.postedAt && !isNaN(new Date(post.postedAt).getTime()) ? post.postedAt : null);
  const timeAgo = useTimeAgo(timestamp || post.postedAt);

  const getTagIcon = (iconName) => {
    switch (iconName) {
      case 'Globe': return <Globe size={12} />;
      case 'Trophy': return <Trophy size={12} />;
      case 'Gamepad2': return <Gamepad2 size={12} />;
      case 'Mic': return <Mic size={12} />;
      case 'MicOff': return <MicOff size={12} />;
      case 'Languages': return <Languages size={12} />;
      default: return null;
    }
  };

  const getRankClass = (rank = '') => {
    const r = rank.toLowerCase();
    if (r.includes('unreal')) return 'rank-unreal';
    if (r.includes('champion')) return 'rank-champion';
    if (r.includes('elite')) return 'rank-elite';
    if (r.includes('diamond')) return 'rank-diamond';
    return '';
  };

  const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${post.epicTag || post.gamertag}&backgroundColor=00b4d8`;

  return (
    <div className={`player-card ${post.matchPercentage >= 80 ? 'top-match' : ''} ${hasIncoming ? 'has-incoming' : ''}`}>

      <div className="card-header-bar">
        <div className={`match-badge ${post.badgeClass}`}>
          <Zap size={13} />
          <span>{post.badgeText}</span>
        </div>
        <span className="posted-time">{timeAgo}</span>
      </div>

      <div className="player-profile-row">
        <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${post.username || post.epicTag || post.gamertag}&backgroundColor=00b4d8`} alt={post.username} className="player-avatar" />
        <div className="player-meta">
          <div className="player-title-row">
            <span className="player-gamertag">{post.username || post.epicTag || post.gamertag}</span>
            {post.isPremium && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                background: 'rgba(251, 191, 36, 0.18)',
                color: '#fbbf24',
                border: '1px solid #fbbf24',
                borderRadius: '4px',
                fontSize: '0.65rem',
                fontWeight: 800,
                padding: '1px 5px',
                marginLeft: '4px'
              }}>
                <Crown size={10} style={{ fill: '#fbbf24' }} /> VIP
              </span>
            )}
            {isMyPost && <span className="my-post-badge">YOU</span>}
            {post.rank && <span className={`player-rank-chip ${getRankClass(post.rank)}`}>{post.rank}</span>}
          </div>
          {post.note && <p className="player-note">{post.note}</p>}
        </div>
      </div>

      <div className="gamer-ids-strip">
        <div className="gamer-id-pill epic" title="Epic Games Tag">
          <Gamepad2 size={11} /> <span>{isMyPost ? (post.epicTag || post.gamertag) : 'Hidden until matched'}</span>
        </div>
        {post.psnId && (
          <div className="gamer-id-pill psn" title="PlayStation Network">
            <span className="platform-prefix">PSN:</span> <span>{isMyPost ? post.psnId : 'Hidden'}</span>
          </div>
        )}
        {post.xboxId && (
          <div className="gamer-id-pill xbox" title="Xbox Gamertag">
            <span className="platform-prefix">Xbox:</span> <span>{isMyPost ? post.xboxId : 'Hidden'}</span>
          </div>
        )}
        {post.nintendoId && (
          <div className="gamer-id-pill nintendo" title="Nintendo ID">
            <span className="platform-prefix">Nintendo:</span> <span>{isMyPost ? post.nintendoId : 'Hidden'}</span>
          </div>
        )}
        {post.discordId && (
          <div className="gamer-id-pill discord" title="Discord Username">
            <MessageSquare size={11} /> <span>{isMyPost ? post.discordId : 'Hidden'}</span>
          </div>
        )}
      </div>

      <div className="tags-row">
        {post.matchTags.map((tag, idx) => (
          <span
            key={idx}
            className={`tag ${tag.matched ? 'match-tag' : ''} ${tag.isMic ? (tag.icon === 'Mic' ? 'mic-yes' : 'mic-no') : ''}`}
          >
            {getTagIcon(tag.icon)} {tag.text}
          </span>
        ))}
      </div>

      <div className={`card-actions ${isMyPost ? 'has-delete' : ''}`}>
        {!isMyPost && (
          <button
            type="button"
            className="btn btn-primary match-btn"
            onClick={() => onMatchPlayer && onMatchPlayer(post)}
            title="Send teammate request to this player"
            style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              borderColor: '#10b981',
              color: '#fff',
              fontWeight: 800
            }}
          >
            <Zap size={14} style={{ fill: '#fff' }} /> Send Teammate Request
          </button>
        )}

        {isMyPost && (
          <button
            type="button"
            className="btn btn-outline copy-btn"
            onClick={() => onCopyGamerTag(post.epicTag || post.gamertag)}
            title="Copy Epic Games Tag"
          >
            <Copy size={13} /> Copy Epic
          </button>
        )}

        {isMyPost && (post.discordId ? (
          <button
            type="button"
            className="btn btn-outline copy-btn"
            onClick={() => onCopyDiscord(post.discordId)}
            title="Copy Discord Username"
          >
            <Copy size={13} /> Copy Discord
          </button>
        ) : post.psnId ? (
          <button
            type="button"
            className="btn btn-outline copy-btn"
            onClick={() => onCopyPsn(post.psnId)}
            title="Copy PlayStation PSN ID"
          >
            <Copy size={13} /> Copy PSN
          </button>
        ) : post.xboxId ? (
          <button
            type="button"
            className="btn btn-outline copy-btn"
            onClick={() => onCopyXbox(post.xboxId)}
            title="Copy Xbox Tag"
          >
            <Copy size={13} /> Copy Xbox
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-outline copy-btn"
            onClick={() => onCopyGamerTag(post.epicTag || post.gamertag)}
          >
            <Copy size={13} /> Add on Epic
          </button>
        ))}

        {isMyPost && (
          <button
            type="button"
            className="btn btn-danger-outline copy-btn"
            title="Delete your post"
            onClick={() => onDeletePost(post.id || post._id)}
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

    </div>
  );
}
