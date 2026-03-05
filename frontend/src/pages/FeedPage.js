import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { communityAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import {
  Heart, MessageCircle, Send, Trash2, Image, X, Loader2, MoreHorizontal
} from 'lucide-react';
import { toast } from 'sonner';

function PostCard({ post, onLike, onDelete, onOpenComments, currentUserId, isAdmin }) {
  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'ora';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `${days}g`;
  };

  const roleBadge = (role) => {
    if (role === 'admin') return <Badge variant="outline" className="text-[9px] badge-purple">Admin</Badge>;
    if (role === 'editor') return <Badge variant="outline" className="text-[9px] badge-blue">Editor</Badge>;
    return null;
  };

  return (
    <Card className="border-gray-100" data-testid={`feed-post-${post.post_id}`}>
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-500 flex-shrink-0">
            {post.author?.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-gray-900">{post.author?.name || 'Utente'}</span>
              {roleBadge(post.author?.role)}
            </div>
            <span className="text-[11px] text-gray-400">{timeAgo(post.created_at)}</span>
          </div>
          {(isAdmin || post.author_id === currentUserId) && (
            <Button variant="ghost" size="icon" className="w-8 h-8 text-gray-400 hover:text-red-500" onClick={() => onDelete(post.post_id)} data-testid={`delete-post-${post.post_id}`}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        {/* Content */}
        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed mb-3">{post.content}</p>
        {post.image_url && (
          <img src={`${process.env.REACT_APP_BACKEND_URL}${post.image_url}`} alt="" className="rounded-lg max-h-80 w-full object-cover mb-3" />
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 pt-2 border-t border-gray-50">
          <Button
            variant="ghost" size="sm"
            className={`gap-1.5 text-xs ${post.user_liked ? 'text-red-500' : 'text-gray-400'}`}
            onClick={() => onLike(post.post_id)}
            data-testid={`like-btn-${post.post_id}`}
          >
            <Heart className={`w-3.5 h-3.5 ${post.user_liked ? 'fill-current' : ''}`} />
            {post.like_count > 0 && post.like_count}
          </Button>
          <Button
            variant="ghost" size="sm"
            className="gap-1.5 text-xs text-gray-400"
            onClick={() => onOpenComments(post.post_id)}
            data-testid={`comments-btn-${post.post_id}`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            {post.comment_count > 0 && post.comment_count}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CommentsSection({ postId, isAdmin, currentUserId }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    communityAPI.getComments(postId).then(r => { setComments(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, [postId]);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      const res = await communityAPI.addComment(postId, newComment.trim());
      setComments(prev => [...prev, res.data]);
      setNewComment('');
    } catch {
      toast.error('Errore');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId) => {
    await communityAPI.deleteComment(commentId);
    setComments(prev => prev.filter(c => c.comment_id !== commentId));
  };

  return (
    <div className="px-5 pb-5 space-y-3" data-testid={`comments-section-${postId}`}>
      {loading ? (
        <div className="text-center py-4"><Loader2 className="w-4 h-4 animate-spin text-gray-400 mx-auto" /></div>
      ) : (
        <>
          {comments.map(c => (
            <div key={c.comment_id} className="flex gap-2 group">
              <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500 flex-shrink-0 mt-0.5">
                {c.author?.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0 bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-xs font-medium text-gray-700">{c.author?.name}</span>
                <p className="text-xs text-gray-600 mt-0.5">{c.content}</p>
              </div>
              {(isAdmin || c.author_id === currentUserId) && (
                <button onClick={() => handleDelete(c.comment_id)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-opacity">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
          <div className="flex gap-2">
            <Textarea
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Scrivi un commento..."
              className="min-h-[36px] h-9 text-xs resize-none"
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSubmit())}
              data-testid={`comment-input-${postId}`}
            />
            <Button size="icon" className="h-9 w-9 flex-shrink-0" onClick={handleSubmit} disabled={submitting || !newComment.trim()} data-testid={`comment-submit-${postId}`}>
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export default function FeedPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newContent, setNewContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [expandedComments, setExpandedComments] = useState({});
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  const load = () => {
    communityAPI.listFeed().then(r => { setPosts(r.data); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Immagine troppo grande (max 5MB)');
      return;
    }
    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePost = async () => {
    if (!newContent.trim() && !selectedImage) return;
    setPosting(true);
    try {
      let imageUrl = '';
      if (selectedImage) {
        setUploadingImage(true);
        const uploadRes = await communityAPI.uploadImage(selectedImage);
        imageUrl = uploadRes.data.url;
        setUploadingImage(false);
      }
      const res = await communityAPI.createPost({ content: newContent.trim(), image_url: imageUrl });
      setPosts(prev => [res.data, ...prev]);
      setNewContent('');
      clearImage();
      toast.success('Post pubblicato');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore');
    } finally {
      setPosting(false);
      setUploadingImage(false);
    }
  };

  const handleLike = async (postId) => {
    try {
      const res = await communityAPI.toggleLike(postId);
      setPosts(prev => prev.map(p => p.post_id === postId ? { ...p, user_liked: res.data.liked, like_count: res.data.count } : p));
    } catch { /* ignore */ }
  };

  const handleDelete = async (postId) => {
    if (!window.confirm('Eliminare questo post?')) return;
    try {
      await communityAPI.deletePost(postId);
      setPosts(prev => prev.filter(p => p.post_id !== postId));
      toast.success('Post eliminato');
    } catch {
      toast.error('Errore');
    }
  };

  const toggleComments = (postId) => {
    setExpandedComments(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div data-testid="feed-page">
      <div className="mb-10">
        <h1 className="text-4xl font-semibold ariadne-heading mb-2">Feed</h1>
        <p className="text-base text-gray-500">Condividi pensieri, risorse e aggiornamenti con la community</p>
      </div>

      {/* New post */}
      <Card className="border-gray-100 mb-6">
        <CardContent className="p-5">
          <Textarea
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
            placeholder="Condividi qualcosa con la community..."
            rows={3}
            className="mb-3 text-sm resize-none"
            data-testid="new-post-input"
          />
          {imagePreview && (
            <div className="relative mb-3 inline-block">
              <img src={imagePreview} alt="Anteprima" className="rounded-lg max-h-48 object-cover" />
              <button
                onClick={clearImage}
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-black/80"
                data-testid="remove-image-btn"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleImageSelect}
                className="hidden"
                data-testid="image-file-input"
              />
              <Button
                variant="ghost" size="sm"
                className="gap-1.5 text-gray-400 hover:text-gray-600"
                onClick={() => fileInputRef.current?.click()}
                data-testid="add-image-btn"
              >
                <Image className="w-4 h-4" />
                <span className="text-xs">Immagine</span>
              </Button>
            </div>
            <Button onClick={handlePost} disabled={posting || (!newContent.trim() && !selectedImage)} className="gap-2" data-testid="publish-post-btn">
              {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {uploadingImage ? 'Caricamento...' : 'Pubblica'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Feed */}
      {loading ? (
        <div className="text-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" /></div>
      ) : posts.length > 0 ? (
        <div className="space-y-4">
          {posts.map(post => (
            <div key={post.post_id}>
              <PostCard
                post={post}
                onLike={handleLike}
                onDelete={handleDelete}
                onOpenComments={toggleComments}
                currentUserId={user?.user_id}
                isAdmin={isAdmin}
              />
              {expandedComments[post.post_id] && (
                <CommentsSection
                  postId={post.post_id}
                  isAdmin={isAdmin}
                  currentUserId={user?.user_id}
                />
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-gray-400 text-sm">
          Nessun post ancora. Sii il primo a condividere qualcosa!
        </div>
      )}
    </div>
  );
}
