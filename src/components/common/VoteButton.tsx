// 投票ボタン (Upvote / Downvote)
import { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { votePost, getAnonymousId } from '../../lib/firestore';
import { useAuth } from '../../contexts/AuthContext';

interface VoteButtonProps {
  postId: string;
  votes: number;
  currentVote?: 1 | -1 | null;
  onVoteChange?: (newVotes: number, newUserVote: 1 | -1 | null) => void;
}

export default function VoteButton({ postId, votes, currentVote = null, onVoteChange }: VoteButtonProps) {
  const { account } = useAuth();
  const [localVote, setLocalVote] = useState<1 | -1 | null>(currentVote);
  const [localVotes, setLocalVotes] = useState(votes);
  const [isVoting, setIsVoting] = useState(false);

  async function handleVote(value: 1 | -1) {
    if (isVoting) return;
    setIsVoting(true);
    try {
      let newVotes = localVotes;
      let newUserVote: 1 | -1 | null = value;

      if (localVote === value) {
        // 同じ方向 → キャンセル
        newVotes -= value;
        newUserVote = null;
      } else if (localVote !== null) {
        // 逆方向 → 変更
        newVotes += value * 2;
      } else {
        // 新規
        newVotes += value;
      }

      setLocalVote(newUserVote);
      setLocalVotes(newVotes);
      
      // ログインIDまたは匿名クライアントIDを使用
      const voterId = account?.id || getAnonymousId();
      await votePost(postId, voterId, value);
      
      onVoteChange?.(newVotes, newUserVote);
    } catch (err) {
      console.error('投票エラー:', err);
    } finally {
      setIsVoting(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-0.5" data-testid={`vote-${postId}`}>
      <button
        onClick={() => handleVote(1)}
        disabled={isVoting}
        className={`rounded-lg p-1 transition-all ${
          localVote === 1
            ? 'bg-violet-500/20 text-violet-400 shadow-sm shadow-violet-500/20'
            : 'text-gray-500 hover:bg-white/5 hover:text-violet-400'
        } disabled:opacity-30 disabled:cursor-not-allowed`}
        data-testid={`btn-upvote-${postId}`}
      >
        <ChevronUp size={20} />
      </button>
      <span className={`text-sm font-bold tabular-nums ${
        localVotes > 0 ? 'text-violet-400' : localVotes < 0 ? 'text-red-400' : 'text-gray-500'
      }`}>
        {localVotes}
      </span>
      <button
        onClick={() => handleVote(-1)}
        disabled={isVoting}
        className={`rounded-lg p-1 transition-all ${
          localVote === -1
            ? 'bg-red-500/20 text-red-400 shadow-sm shadow-red-500/20'
            : 'text-gray-500 hover:bg-white/5 hover:text-red-400'
        } disabled:opacity-30 disabled:cursor-not-allowed`}
        data-testid={`btn-downvote-${postId}`}
      >
        <ChevronDown size={20} />
      </button>
    </div>
  );
}
