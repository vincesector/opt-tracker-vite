import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';

const Settings = () => {
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setName(user?.user_metadata?.full_name || '');
      // If avatar_url is missing but Google picture exists, sync it
      if (!user?.user_metadata?.avatar_url && user?.user_metadata?.picture) {
        await supabase.auth.updateUser({ data: { avatar_url: user.user_metadata.picture } });
        setAvatarUrl(user.user_metadata.picture);
      } else {
        setAvatarUrl(user?.user_metadata?.avatar_url || '');
      }
    };
    fetchUser();
  }, []);

  const handleNameChange = async (e) => {
    setName(e.target.value);
  };

  const handleNameSave = async () => {
    setError(null);
    const { error } = await supabase.auth.updateUser({ data: { full_name: name } });
    if (error) setError(error.message);
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;
    setUploading(true);
    setError(null);
    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const { data, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        });
      if (uploadError) throw uploadError;
      // Get public URL
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const publicUrl = urlData?.publicUrl;
      if (!publicUrl) throw new Error('Failed to get public URL');
      // Update user metadata
      const { error: metaError } = await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
      if (metaError) throw metaError;
      setAvatarUrl(publicUrl);
    } catch (err) {
      setError(err.message || 'Failed to upload avatar');
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div className="max-w-lg mx-auto mt-12 bg-[#161B22] border border-[#30363D] rounded-xl p-8 shadow-lg">
      <h2 className="text-2xl font-bold text-emerald-400 mb-6">Account Settings</h2>
      <div className="flex flex-col items-center mb-6">
        <div className="relative w-24 h-24 mb-2">
          <img
            src={avatarUrl || '/vite.svg'}
            alt="Profile"
            className="w-24 h-24 rounded-full object-cover border-2 border-emerald-400"
          />
          <label className="absolute bottom-0 right-0 bg-emerald-500 text-white rounded-full p-1 cursor-pointer hover:bg-emerald-600 transition">
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={uploading} />
            <span className="material-icons text-sm">edit</span>
          </label>
        </div>
        <div className="w-full flex flex-col items-center">
          <input
            type="text"
            value={name}
            onChange={handleNameChange}
            className="input-field text-center text-lg font-semibold mb-2 bg-[#22272e] border border-[#30363D] rounded px-3 py-2 text-[#C9D1D9]"
            placeholder="Your Name"
            disabled={uploading}
          />
          <button
            onClick={handleNameSave}
            className="btn btn-primary px-4 py-1 text-sm"
            disabled={uploading}
          >
            Save Name
          </button>
        </div>
      </div>
      <button
        onClick={handleLogout}
        className="btn btn-danger w-full py-2 mt-4"
      >
        Log Out
      </button>
      {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
    </div>
  );
};

export default Settings;
