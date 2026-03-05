import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { communityAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import {
  Heart, MessageCircle, Send, Trash2, ImagePlus, X, Loader2, Camera
} from 'lucide-react';
import { toast } from 'sonner';

const API_BASE = process.env.REACT_APP_BACKEND_URL;

function getInitialColor(name) {
  const h = (name?.charCodeAt(0) || 0) * 7 % 360;
  return { bg: `hsl(${h} 55% 90%)`, fg: `hsl(${h} 55% 35%)` };
}

function PostCard({ post, onLike, onDelete, onOpenComments, currentUserId, isAdmin }) {
  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'ora';
    if (mins < 60) return `${mins}m fa`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h fa`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}g fa`;
    return new Date(dateStr).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
  };

  const roleBadge = (role) => {
    if (role === 'admin') return <Badge variant="outline" className="text-[9px] badge-purple ml-1">Admin</Badge>;
    if (role === 'editor') return <Badge variant="outline" className="text-[9px] badge-blue ml-1">Trainer</Badge>;
    return null;
  };

  const color = getInitialColor(post.author?.name);
  const hasImage = post.image_url && post.image_url.length > 0;
  const imgSrc = hasImage ? (post.image_url.startsWith('http') ? post.image_url : `${API_BASE}${post.image_url}`) : null;

  return (
    <div className="feed-card" data-testid={`feed-post-${post.post_id}`}>
      {/* Author header */}
      <div className="flex items-center gap-3 p-4 pb-3">
        <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 overflow-hidden" style={{ background: color.bg, color: color.fg }}>
          {post.author?.picture ? <img src={post.author.picture} alt="" className="w-full h-full object-cover" /> : post.author?.name?.charAt(0)?.toUpperCase() || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap">
            <span className="text-sm font-semibold">{post.author?.name || 'Utente'}</span>
            {roleBadge(post.author?.role)}
          </div>
          <span className="text-[11px] text-gray-400">{timeAgo(post.created_at)}</span>
        </div>
        {(isAdmin || post.author_id === currentUserId) && (
          <Button variant="ghost" size="icon" className="w-8 h-8 text-gray-300 hover:text-red-500" onClick={() => onDelete(post.post_id)} data-testid={`delete-post-${post.post_id}`}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {/* Text content */}
      <div className="px-4 pb-3">
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>
      </div>

      {/* Image - full width like LinkedIn */}
      {imgSrc && (
        <div className="w-full">
          <img src={imgSrc} alt="" className="feed-card-image" data-testid={`post-image-${post.post_id}`} />
        </div>
      )}

      {/* Engagement stats */}
      {(post.like_count > 0 || post.comment_count > 0) && (
        <div className="px-4 pt-2 flex items-center gap-3 text-[11px] text-gray-400">
          {post.like_count > 0 && <span>{post.like_count} {post.like_count === 1 ? 'mi piace' : 'mi piace'}</span>}
          {post.comment_count > 0 && <span>{post.comment_count} {post.comment_count === 1 ? 'commento' : 'commenti'}</span>}
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center border-t mx-4 mt-2">
        <button
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-medium transition-colors ${post.user_liked ? 'text-red-500' : 'text-gray-400 hover:text-gray-600'}`}
          onClick={() => onLike(post.post_id)}
          data-testid={`like-btn-${post.post_id}`}
        >
          <Heart className={`w-4 h-4 ${post.user_liked ? 'fill-current' : ''}`} />
          Mi piace
        </button>
        <button
          className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
          onClick={() => onOpenComments(post.post_id)}
          data-testid={`comments-btn-${post.post_id}`}
        >
          <MessageCircle className="w-4 h-4" />
          Commenta
        </button>
      </div>
    </div>
  );
}

function CommentsSection({ postId, isAdmin, currentUserId }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    communityAPI.listComments(postId).then(r => { setComments(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, [postId]);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      const res = await communityAPI.addComment(postId, newComment.trim());
      setComments(prev => [...prev, res.data]);
      setNewComment('');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Errore');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId) => {
    try {
      await communityAPI.deleteComment(postId, commentId);
      setComments(prev => prev.filter(c => c.comment_id !== commentId));
      toast.success('Commento eliminato');
    } catch { toast.error('Errore'); }
  };

  if (loading) return <div className="p-3 text-center text-xs text-gray-400"><Loader2 className="w-4 h-4 animate-spin mx-auto" /></div>;

  return (
    <div className="px-4 pb-4 space-y-3">
      {comments.map(c => {
        const color = getInitialColor(c.author?.name);
        return (
          <div key={c.comment_id} className="flex gap-2.5 group" data-testid={`comment-${c.comment_id}`}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5" style={{ background: color.bg, color: color.fg }}>
              {c.author?.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="bg-gray-50 rounded-xl px-3 py-2">
                <span className="text-xs font-semibold">{c.author?.name}</span>
                <p className="text-xs text-gray-600 mt-0.5">{c.content}</p>
              </div>
              <span className="text-[10px] text-gray-400 ml-3">{new Date(c.created_at).toLocaleDateString('it-IT')}</span>
            </div>
            {(isAdmin || c.author_id === currentUserId) && (
              <button className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 mt-1" onClick={() => handleDelete(c.comment_id)}>
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        );
      })}
      <div className="flex gap-2 pt-1">
        <input
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          placeholder="Scrivi un commento..."
          className="flex-1 text-xs px-3 py-2 rounded-full bg-gray-50 border-0 outline-none focus:ring-1 focus:ring-gray-200"
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSubmit())}
          data-testid={`comment-input-${postId}`}
        />
        <Button size="icon" className="w-8 h-8 rounded-full" disabled={submitting || !newComment.trim()} onClick={handleSubmit} data-testid={`comment-submit-${postId}`}>
          <Send className="w-3 h-3" />
        </Button>
      </div>
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
      toast.success('Post pubblicato!');
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
      setPosts(prev => prev.map(p => p.post_id === postId ? { ...p, user_liked: res.data.liked, like_count: res.data.liked ? p.like_count + 1 : p.like_count - 1 } : p));
    } catch { toast.error('Errore'); }
  };

  const handleDelete = async (postId) => {
    if (!window.confirm('Eliminare questo post?')) return;
    try {
      await communityAPI.deletePost(postId);
      setPosts(prev => prev.filter(p => p.post_id !== postId));
      toast.success('Post eliminato');
    } catch { toast.error('Errore'); }
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div data-testid="feed-page">
      <div className="mb-10">
        <h1 className="text-4xl font-semibold ariadne-heading mb-2">Bacheca della Community</h1>
        <p className="text-base text-gray-500">Condividi esperienze, riflessioni e risorse con la community Ariadne</p>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* New post composer - LinkedIn style */}
        <div className="feed-card mb-6">
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5" style={{ background: getInitialColor(user?.name).bg, color: getInitialColor(user?.name).fg }}>
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1">
                <Textarea
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  placeholder="Condividi un pensiero, un'esperienza o una risorsa..."
                  rows={3}
                  className="border-0 bg-transparent p-0 text-sm resize-none focus-visible:ring-0 placeholder:text-gray-400"
                  data-testid="new-post-input"
                />
              </div>
            </div>

            {/* Image preview */}
            {imagePreview && (
              <div className="relative mt-3 ml-14">
                <img src={imagePreview} alt="Anteprima" className="rounded-lg max-h-64 w-full object-cover" />
                <button
                  onClick={clearImage}
                  className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-black/80 transition-colors"
                  data-testid="remove-image-btn"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Actions bar */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t ml-14">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleImageSelect}
                className="hidden"
                data-testid="image-file-input"
              />
              <button
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all"
                onClick={() => fileInputRef.current?.click()}
                data-testid="add-image-btn"
              >
                <ImagePlus className="w-5 h-5" />
                <span>Aggiungi foto</span>
              </button>
              <Button
                onClick={handlePost}
                disabled={posting || (!newContent.trim() && !selectedImage)}
                className="gap-2 rounded-full px-5"
                data-testid="publish-post-btn"
              >
                {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {uploadingImage ? 'Caricamento...' : 'Pubblica'}
              </Button>
            </div>
          </div>
        </div>

        {/* Posts list */}
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
                  onOpenComments={(id) => setExpandedComments(prev => ({ ...prev, [id]: !prev[id] }))}
                  currentUserId={user?.user_id}
                  isAdmin={isAdmin}
                />
                {expandedComments[post.post_id] && (
                  <div className="feed-card border-t-0 rounded-t-none -mt-1">
                    <CommentsSection postId={post.post_id} isAdmin={isAdmin} currentUserId={user?.user_id} />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Camera className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-400 text-sm">Nessun post ancora. Inizia la conversazione!</p>
          </div>
        )}
      </div>
    </div>
  );
}
