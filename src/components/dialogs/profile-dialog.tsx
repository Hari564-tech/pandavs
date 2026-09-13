import { useState, useEffect, useRef, type FormEvent, type ChangeEvent } from "react";
import { toast } from "sonner";
import {
  Camera,
  ExternalLink,
  Github,
  Linkedin,
  Globe,
  Mail,
  Phone,
  MapPin,
  School,
  GraduationCap,
  Briefcase,
  Edit3,
  Loader2,
  Sparkles,
  Bell,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useHub } from "@/lib/store";
import {
  useMeQuery,
  useTeamQuery,
  useUpdateProfileMutation,
  usePresignAvatarUploadMutation,
  useUploadAvatarMutation,
  usePingMemberMutation,
} from "@/lib/api-hooks";

export function ProfileDialog() {
  const open = useHub((s) => s.profileDialogOpen);
  const setOpen = useHub((s) => s.setProfileDialog);
  const targetUserId = useHub((s) => s.profileTargetUserId);

  const { data: meData } = useMeQuery();
  const { data: team = [] } = useTeamQuery();
  const updateProfile = useUpdateProfileMutation();
  const presignAvatar = usePresignAvatarUploadMutation();
  const uploadAvatar = useUploadAvatarMutation();
  const pingMember = usePingMemberMutation();

  const activeUser = meData?.profile;
  const isSelf = !targetUserId || targetUserId === activeUser?.user_id;

  // Resolved user profile: either target or current user
  const profile = isSelf
    ? activeUser
    : (team.find((t) => t.user_id === targetUserId) ?? activeUser);

  const [isEditing, setIsEditing] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [dept, setDept] = useState("");
  const [college, setCollege] = useState("");
  const [year, setYear] = useState("");
  const [regNo, setRegNo] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState("");
  const [location, setLocation] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setTitle(profile.title || "");
      setDept(profile.dept || "");
      setCollege(profile.college || "");
      setYear(profile.year || "");
      setRegNo(profile.registration_no || "");
      setPhone(profile.phone || "");
      setBio(profile.bio || "");
      setSkills(profile.skills || "");
      setLocation(profile.location || "");
      setLinkedinUrl(profile.linkedin_url || "");
      setGithubUrl(profile.github_url || "");
      setPortfolioUrl(profile.portfolio_url || "");
      setAvatarUrl(profile.avatar_url || null);
    }
    // When switching profiles or reopening, reset to view mode
    setIsEditing(false);
  }, [profile, open]);

  async function handleAvatarUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const targetId = profile?.user_id || targetUserId || activeUser?.user_id;
    if (!file || !targetId) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file size must be less than 5MB");
      return;
    }

    try {
      setUploadingAvatar(true);
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result as string;
          // Set preview immediately for optimistic UI
          setAvatarUrl(base64);

          // Upload directly to Supabase storage + persist to PostgreSQL DB
          const result = await uploadAvatar.mutateAsync({
            targetUserId: targetId,
            fileName: file.name,
            mimeType: file.type,
            base64,
          });

          if (result?.avatarUrl) {
            setAvatarUrl(result.avatarUrl);
          }
          toast.success("Profile photo uploaded & saved!");
        } catch (err: unknown) {
          console.error("Avatar save error:", err);
          toast.error("Failed to save avatar", {
            description: (err as Error)?.message || "Upload error",
          });
        } finally {
          setUploadingAvatar(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: unknown) {
      setUploadingAvatar(false);
      toast.error("Failed to read image file");
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!profile?.user_id) return;

    if (!name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    if (linkedinUrl && !linkedinUrl.startsWith("http")) {
      toast.error("LinkedIn URL must start with https://");
      return;
    }

    if (githubUrl && !githubUrl.startsWith("http")) {
      toast.error("GitHub URL must start with https://");
      return;
    }

    if (portfolioUrl && !portfolioUrl.startsWith("http")) {
      toast.error("Portfolio URL must start with https://");
      return;
    }

    try {
      await updateProfile.mutateAsync({
        userId: profile.user_id,
        data: {
          name: name.trim(),
          title: title.trim(),
          dept: dept.trim(),
          college: college.trim() || null,
          year: year.trim() || null,
          registration_no: regNo.trim() || null,
          phone: phone.trim() || null,
          bio: bio.trim() || null,
          skills: skills.trim() || null,
          location: location.trim() || null,
          linkedin_url: linkedinUrl.trim() || null,
          github_url: githubUrl.trim() || null,
          portfolio_url: portfolioUrl.trim() || null,
          avatar_url: avatarUrl,
        },
      });

      toast.success("Profile updated successfully");
      setIsEditing(false);
    } catch (err: unknown) {
      toast.error("Failed to update profile", {
        description: (err as Error)?.message || "Server error",
      });
    }
  }

  const roleLabelMap: Record<string, { label: string; color: string }> = {
    super_admin: { label: "Super Admin", color: "bg-red-500/10 text-red-400 border-red-500/20" },
    faculty: { label: "Faculty Guide", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
    lead: { label: "Team Lead", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
    member: { label: "Team Member", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  };

  const currentRole = roleLabelMap[profile?.role ?? "member"] ?? roleLabelMap.member;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto bg-slate-950 border-slate-800 text-slate-100 p-0 gap-0">
        {/* Banner Header */}
        <div className="relative h-28 bg-gradient-to-r from-blue-900/60 via-indigo-950/80 to-slate-900 border-b border-slate-800 px-6 pt-6 flex items-start justify-between">
          <div className="flex items-center gap-2 text-xs font-mono text-blue-300">
            <Sparkles className="w-3.5 h-3.5" />
            <span>RVIT OPERATIONS · RESEARCH IDENTITY</span>
          </div>
          <Badge variant="outline" className={`${currentRole.color} text-xs font-medium`}>
            {currentRole.label}
          </Badge>
        </div>

        {/* Profile Card Body */}
        <div className="px-6 pb-6 pt-0 relative">
          {/* Avatar floating between banner & body */}
          <div className="flex items-end justify-between -mt-12 mb-4">
            <div className="relative group">
              <Avatar className="w-24 h-24 border-4 border-slate-950 shadow-xl bg-slate-900 text-lg font-bold">
                <AvatarImage src={avatarUrl ?? undefined} alt={profile?.name} />
                <AvatarFallback className="bg-slate-800 text-slate-200">
                  {profile?.short || profile?.name?.slice(0, 2).toUpperCase() || "RV"}
                </AvatarFallback>
              </Avatar>

              {isSelf && (
                <button
                  id="changeAvatarBtn"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center text-white opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer group-hover:opacity-90"
                  title="Upload profile picture"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      <Camera className="w-5 h-5 mb-1" />
                      <span className="text-[10px] font-medium">Change</span>
                    </>
                  )}
                </button>
              )}
              <input
                id="avatarFileInput"
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>

            {/* View / Edit toggle button for profile owner */}
            {isSelf && (
              <div className="flex items-center gap-2">
                {!isEditing ? (
                  <Button
                    id="editProfileBtn"
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                    className="border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs"
                  >
                    <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                    Edit Profile
                  </Button>
                ) : (
                  <>
                    <Button
                      id="uploadPhotoBtn"
                      size="sm"
                      variant="outline"
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs"
                    >
                      <Camera className="w-3.5 h-3.5 mr-1.5" />
                      {uploadingAvatar ? "Uploading..." : "Upload Photo"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsEditing(false)}
                      className="text-slate-400 hover:text-slate-200 text-xs"
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            )}

            {!isSelf && profile && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pingMember.isPending}
                  onClick={async () => {
                    try {
                      await pingMember.mutateAsync(profile.user_id);
                      toast.success(`Reminder notification sent to ${profile.name}`);
                    } catch (err) {
                      toast.error("Failed to send reminder");
                    }
                  }}
                  className="border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs"
                >
                  <Bell className="w-3.5 h-3.5 mr-1.5 text-accent" />
                  {pingMember.isPending ? "Sending..." : "Ping / Remind"}
                </Button>
              </div>
            )}
          </div>

          {!isEditing ? (
            /* VIEW MODE */
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  {profile?.name}
                </h2>
                <p className="text-sm text-slate-400 mt-0.5">
                  {profile?.title || "Member"} · {profile?.dept || "RVIT"}
                </p>
                {profile?.college && (
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                    <School className="w-3.5 h-3.5" />
                    {profile.college}
                  </p>
                )}
              </div>

              {/* Bio */}
              {profile?.bio ? (
                <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800/80 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {profile.bio}
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-slate-900/30 border border-slate-800/40 text-xs text-slate-500 italic">
                  No bio added yet.
                </div>
              )}

              {/* Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
                <div className="flex items-center gap-2 p-2.5 rounded-md bg-slate-900/40 border border-slate-800/50">
                  <Mail className="w-4 h-4 text-blue-400 shrink-0" />
                  <span className="truncate">{profile?.email}</span>
                </div>

                {profile?.phone && (
                  <div className="flex items-center gap-2 p-2.5 rounded-md bg-slate-900/40 border border-slate-800/50">
                    <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="truncate">{profile.phone}</span>
                  </div>
                )}

                {profile?.year && (
                  <div className="flex items-center gap-2 p-2.5 rounded-md bg-slate-900/40 border border-slate-800/50">
                    <GraduationCap className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>{profile.year}</span>
                  </div>
                )}

                {profile?.registration_no && (
                  <div className="flex items-center gap-2 p-2.5 rounded-md bg-slate-900/40 border border-slate-800/50">
                    <Briefcase className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="font-mono">{profile.registration_no}</span>
                  </div>
                )}

                {profile?.location && (
                  <div className="flex items-center gap-2 p-2.5 rounded-md bg-slate-900/40 border border-slate-800/50">
                    <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{profile.location}</span>
                  </div>
                )}
              </div>

              {/* Skills Chips */}
              {profile?.skills && (
                <div>
                  <Label className="text-xs text-slate-400 font-medium mb-2 block">
                    Technical Skills & Focus Areas
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.skills.split(",").map((s, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-blue-950/40 border border-blue-800/40 text-blue-300"
                      >
                        {s.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Social & Portfolio Links */}
              <div className="pt-2 border-t border-slate-800/80 flex flex-wrap gap-2">
                {profile?.linkedin_url ? (
                  <a
                    href={profile.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 text-xs font-medium transition-colors"
                  >
                    <Linkedin className="w-3.5 h-3.5" />
                    <span>LinkedIn Profile</span>
                    <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
                  </a>
                ) : null}

                {profile?.github_url ? (
                  <a
                    href={profile.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
                  >
                    <Github className="w-3.5 h-3.5" />
                    <span>GitHub</span>
                    <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
                  </a>
                ) : null}

                {profile?.portfolio_url ? (
                  <a
                    href={profile.portfolio_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 border border-purple-500/20 text-xs font-medium transition-colors"
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Portfolio</span>
                    <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
                  </a>
                ) : null}
              </div>
            </div>
          ) : (
            /* EDIT MODE */
            <form onSubmit={handleSubmit} className="space-y-4 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="prof-name" className="text-xs text-slate-300">
                    Full Name *
                  </Label>
                  <Input
                    id="prof-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="mt-1 bg-slate-900 border-slate-700 text-xs text-white"
                  />
                </div>

                <div>
                  <Label htmlFor="prof-title" className="text-xs text-slate-300">
                    Title / Role Description
                  </Label>
                  <Input
                    id="prof-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Lead Full-Stack Engineer"
                    className="mt-1 bg-slate-900 border-slate-700 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="prof-dept" className="text-xs text-slate-300">
                    Department
                  </Label>
                  <Input
                    id="prof-dept"
                    value={dept}
                    onChange={(e) => setDept(e.target.value)}
                    placeholder="e.g. CSE / ECE"
                    className="mt-1 bg-slate-900 border-slate-700 text-xs text-white"
                  />
                </div>

                <div>
                  <Label htmlFor="prof-college" className="text-xs text-slate-300">
                    College / Institution
                  </Label>
                  <Input
                    id="prof-college"
                    value={college}
                    onChange={(e) => setCollege(e.target.value)}
                    placeholder="e.g. RV Institute of Technology"
                    className="mt-1 bg-slate-900 border-slate-700 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="prof-year" className="text-xs text-slate-300">
                    Year of Study
                  </Label>
                  <Input
                    id="prof-year"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder="e.g. Year 4"
                    className="mt-1 bg-slate-900 border-slate-700 text-xs text-white"
                  />
                </div>

                <div>
                  <Label htmlFor="prof-reg" className="text-xs text-slate-300">
                    Reg. Number
                  </Label>
                  <Input
                    id="prof-reg"
                    value={regNo}
                    onChange={(e) => setRegNo(e.target.value)}
                    placeholder="e.g. RVIT-CS-2022-014"
                    className="mt-1 bg-slate-900 border-slate-700 text-xs text-white"
                  />
                </div>

                <div>
                  <Label htmlFor="prof-phone" className="text-xs text-slate-300">
                    Phone Number
                  </Label>
                  <Input
                    id="prof-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="mt-1 bg-slate-900 border-slate-700 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="prof-bio" className="text-xs text-slate-300">
                  Bio / Research Summary
                </Label>
                <Textarea
                  id="prof-bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Share your research interests, project specialties, or background..."
                  rows={3}
                  className="mt-1 bg-slate-900 border-slate-700 text-xs text-white resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="prof-skills" className="text-xs text-slate-300">
                    Skills (comma-separated)
                  </Label>
                  <Input
                    id="prof-skills"
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    placeholder="React, TypeScript, PyTorch, ROS2"
                    className="mt-1 bg-slate-900 border-slate-700 text-xs text-white"
                  />
                </div>

                <div>
                  <Label htmlFor="prof-loc" className="text-xs text-slate-300">
                    Location
                  </Label>
                  <Input
                    id="prof-loc"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Bengaluru, India"
                    className="mt-1 bg-slate-900 border-slate-700 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="prof-linkedin" className="text-xs text-slate-300 flex items-center gap-1.5">
                  <Linkedin className="w-3.5 h-3.5 text-blue-400" />
                  LinkedIn Profile URL
                </Label>
                <Input
                  id="prof-linkedin"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  placeholder="https://linkedin.com/in/yourprofile"
                  className="mt-1 bg-slate-900 border-slate-700 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="prof-github" className="text-xs text-slate-300 flex items-center gap-1.5">
                    <Github className="w-3.5 h-3.5 text-slate-300" />
                    GitHub URL
                  </Label>
                  <Input
                    id="prof-github"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/username"
                    className="mt-1 bg-slate-900 border-slate-700 text-xs text-white"
                  />
                </div>

                <div>
                  <Label htmlFor="prof-web" className="text-xs text-slate-300 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-purple-400" />
                    Portfolio / Website
                  </Label>
                  <Input
                    id="prof-web"
                    value={portfolioUrl}
                    onChange={(e) => setPortfolioUrl(e.target.value)}
                    placeholder="https://yoursite.dev"
                    className="mt-1 bg-slate-900 border-slate-700 text-xs text-white"
                  />
                </div>
              </div>

              <DialogFooter className="pt-3 border-t border-slate-800 gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsEditing(false)}
                  disabled={updateProfile.isPending}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateProfile.isPending}
                  className="bg-blue-600 hover:bg-blue-500 text-xs text-white font-medium"
                >
                  {updateProfile.isPending ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
