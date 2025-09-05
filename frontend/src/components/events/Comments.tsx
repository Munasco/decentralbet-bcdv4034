'use client';

import { useState, useMemo, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { 
  MessageSquare, 
  Heart, 
  Reply, 
  MoreVertical,
  Send,
  Filter,
  Users
} from 'lucide-react';

interface Comment {
  id: string;
  author: {
    address: string;
    avatar?: string;
    position?: 'LONG' | 'SHORT';
    positionSize?: number;
    reputation: number;
  };
  content: string;
  timestamp: Date;
  likes: number;
  liked: boolean;
  replies: Comment[];
  parentId?: string;
  mentions?: string[];
}

interface CommentsProps {
  marketId: number;
  className?: string;
}

export default function Comments({ className = '' }: { className?: string }) {
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'popular' | 'holders'>('popular');
  
  // Sample comments data
  const sampleComments: Comment[] = useMemo(() => [
    {
      id: '1',
      author: {
        address: '0x1234567890abcdef1234567890abcdef12345678',
        position: 'LONG',
        positionSize: 2500,
        reputation: 85
      },
      content: "The technical indicators are looking extremely bullish. RSI showing oversold conditions and we're seeing strong support at the 68¢ level. This could be the perfect entry point for a YES position.",
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      likes: 24,
      liked: false,
      replies: [
        {
          id: '1a',
          author: {
            address: '0xabcdef1234567890abcdef1234567890abcdef12',
            position: 'SHORT',
            positionSize: 1800,
            reputation: 72
          },
          content: "I respectfully disagree. The volume has been declining and whale activity suggests distribution rather than accumulation. @0x1234...5678 what's your take on the order book depth?",
          timestamp: new Date(Date.now() - 3 * 60 * 1000),
          likes: 12,
          liked: true,
          replies: [],
          parentId: '1',
          mentions: ['0x1234567890abcdef1234567890abcdef12345678']
        }
      ]
    },
    {
      id: '2',
      author: {
        address: '0x9876543210fedcba9876543210fedcba98765432',
        position: 'SHORT',
        positionSize: 5200,
        reputation: 92
      },
      content: "🐻 Big money is quietly exiting their positions. I've been tracking wallet movements and seeing consistent outflows from major holders. This is not the time to be bullish.",
      timestamp: new Date(Date.now() - 12 * 60 * 1000),
      likes: 18,
      liked: false,
      replies: []
    },
    {
      id: '3',
      author: {
        address: '0xdef0123456789abcdef0123456789abcdef012345',
        reputation: 58
      },
      content: "As someone new to prediction markets, can anyone explain why the spread between YES and NO prices seems so wide? Is this normal for markets with this much volume?",
      timestamp: new Date(Date.now() - 18 * 60 * 1000),
      likes: 8,
      liked: false,
      replies: [
        {
          id: '3a',
          author: {
            address: '0x5555aaaa5555aaaa5555aaaa5555aaaa5555aaaa',
            position: 'LONG',
            positionSize: 950,
            reputation: 67
          },
          content: "The wide spread indicates uncertainty and lower liquidity. It's actually a good sign for potential profits if you're confident in your position. Welcome to the community! 🎯",
          timestamp: new Date(Date.now() - 15 * 60 * 1000),
          likes: 15,
          liked: false,
          replies: [],
          parentId: '3'
        }
      ]
    },
    {
      id: '4',
      author: {
        address: '0xbeefc0febeefc0febeefc0febeefc0febeefc0fe',
        position: 'LONG',
        positionSize: 7800,
        reputation: 94
      },
      content: "🚨 WHALE ALERT 🚨 Just spotted a 15,000 YES position being built up over the last hour. Someone with deep pockets is very confident about this outcome. Following smart money here. 📈",
      timestamp: new Date(Date.now() - 25 * 60 * 1000),
      likes: 45,
      liked: true,
      replies: []
    },
    {
      id: '5',
      author: {
        address: '0x7777777777777777777777777777777777777777',
        position: 'SHORT',
        positionSize: 3400,
        reputation: 79
      },
      content: "Market sentiment analysis from social media shows declining confidence. Twitter mentions down 23% and negative sentiment increasing. The fundamentals don't support current pricing.",
      timestamp: new Date(Date.now() - 35 * 60 * 1000),
      likes: 31,
      liked: false,
      replies: []
    }
  ], []);

  const formatTimeAgo = useCallback((date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (minutes < 60) {
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else {
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    }
  }, []);

  const sortedComments = useMemo(() => {
    const comments = [...sampleComments];
    
    switch (sortBy) {
      case 'newest':
        return comments.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      case 'popular':
        return comments.sort((a, b) => b.likes - a.likes);
      case 'holders':
        return comments.sort((a, b) => {
          const aSize = a.author.positionSize || 0;
          const bSize = b.author.positionSize || 0;
          return bSize - aSize;
        });
      default:
        return comments;
    }
  }, [sampleComments, sortBy]);

  const handleLike = useCallback((commentId: string) => {
    // In a real app, this would make an API call
    console.log('Liked comment:', commentId);
  }, []);

  const handleReply = useCallback((commentId: string) => {
    setReplyingTo(commentId);
  }, []);

  const handlePostComment = useCallback(() => {
    if (newComment.trim()) {
      // In a real app, this would make an API call
      console.log('Posting comment:', newComment);
      setNewComment('');
    }
  }, [newComment]);

  const handlePostReply = useCallback(() => {
    if (replyContent.trim() && replyingTo) {
      // In a real app, this would make an API call
      console.log('Posting reply:', replyContent, 'to:', replyingTo);
      setReplyContent('');
      setReplyingTo(null);
    }
  }, [replyContent, replyingTo]);

  const CommentItem = ({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) => (
    <Card className={`bg-gray-800/30 border-gray-700/50 ${isReply ? 'ml-8 mt-2' : ''}`}>
      <CardContent className="p-4">
        <div className="flex gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={comment.author.avatar} />
            <AvatarFallback className="bg-gray-700 text-gray-300">
              {comment.author.address.slice(2, 4).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-gray-200">
                {comment.author.address.slice(0, 6)}...{comment.author.address.slice(-4)}
              </span>
              
              {comment.author.position && (
                <Badge 
                  variant="outline"
                  className={`text-xs ${
                    comment.author.position === 'LONG' 
                      ? 'bg-green-600/20 text-green-300 border-green-600/30' 
                      : 'bg-red-600/20 text-red-300 border-red-600/30'
                  }`}
                >
                  {comment.author.position} {comment.author.positionSize && `$${comment.author.positionSize}`}
                </Badge>
              )}
              
              <Badge variant="outline" className="text-xs text-gray-400 border-gray-600">
                Rep: {comment.author.reputation}
              </Badge>
              
              <span className="text-xs text-gray-400">
                {formatTimeAgo(comment.timestamp)}
              </span>
            </div>
            
            <p className="text-sm text-gray-300 mb-3 leading-relaxed">
              {comment.content}
            </p>
            
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleLike(comment.id)}
                className={`h-8 px-2 ${
                  comment.liked 
                    ? 'text-red-400 hover:text-red-300' 
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                <Heart className={`w-4 h-4 mr-1 ${comment.liked ? 'fill-current' : ''}`} />
                {comment.likes}
              </Button>
              
              {!isReply && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleReply(comment.id)}
                  className="h-8 px-2 text-gray-400 hover:text-gray-300"
                >
                  <Reply className="w-4 h-4 mr-1" />
                  Reply
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-gray-400 hover:text-gray-300"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
        
        {/* Render replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-4">
            {comment.replies.map((reply) => (
              <CommentItem key={reply.id} comment={reply} isReply={true} />
            ))}
          </div>
        )}
        
        {/* Reply composer */}
        {replyingTo === comment.id && (
          <div className="mt-4 ml-8">
            <Textarea
              placeholder={`Reply to ${comment.author.address.slice(0, 6)}...${comment.author.address.slice(-4)}`}
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              className="bg-gray-700/50 border-gray-600 text-gray-200 placeholder:text-gray-400 min-h-[80px]"
            />
            <div className="flex justify-end gap-2 mt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReplyingTo(null)}
                className="text-gray-400 hover:text-gray-300"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handlePostReply}
                disabled={!replyContent.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Send className="w-4 h-4 mr-1" />
                Reply
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Card className={`bg-gray-900 border-gray-700 ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-gray-100">
            <MessageSquare className="w-5 h-5" />
            Discussion
          </CardTitle>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-gray-200"
            >
              <option value="popular">Most Popular</option>
              <option value="newest">Newest First</option>
              <option value="holders">Top Holders</option>
            </select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Comment Composer */}
        <div className="space-y-3">
          <Textarea
            placeholder="Share your analysis, ask questions, or discuss market trends..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="bg-gray-800/50 border-gray-600 text-gray-200 placeholder:text-gray-400 min-h-[100px]"
          />
          <div className="flex justify-between items-center">
            <div className="text-xs text-gray-400">
              <Users className="w-4 h-4 inline mr-1" />
              {sampleComments.length} comments • Be respectful and constructive
            </div>
            <Button
              onClick={handlePostComment}
              disabled={!newComment.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Send className="w-4 h-4 mr-2" />
              Post Comment
            </Button>
          </div>
        </div>

        {/* Comments List */}
        <ScrollArea className="h-[600px]">
          <div className="space-y-4 pr-4">
            {sortedComments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
