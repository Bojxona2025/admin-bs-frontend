"use client";
import { Edit, User, Calendar, Phone, Mail, Users } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

const ProfileTab = ({ user, isEditing, setIsEditing, updateUserProfile }) => {
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    email: user.email || "",
    phone: user.phone || "",
    gender: user.gender || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!formData.firstName || !formData.lastName || !formData.phone) {
      setError(t("profile.validation.required_fields"));
      return;
    }

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      setError(t("profile.validation.invalid_email"));
      return;
    }

    if (!/^\+998\d{9}$/.test(formData.phone)) {
      setError(t("profile.validation.invalid_phone"));
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await updateUserProfile(formData);
      setIsEditing(false);
    } catch (error) {
      console.error("Profile yangilashda xatolik:", error);
      setError(error.message || t("profile.errors.update_failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email || "",
      phone: user.phone || "",
      gender: user.gender || "",
    });
    setIsEditing(false);
    setError(null);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setError(null);
  };

  const getGenderDisplay = (gender) => {
    switch (gender) {
      case "male":
        return t("profile.gender.male");
      case "female":
        return t("profile.gender.female");
      case "other":
        return t("profile.gender.other");
      default:
        return "-";
    }
  };

  const getRoleDisplay = (role, isWorker) => {
    if (role === "admin") return t("profile.roles.admin");
    if (isWorker) return t("profile.roles.worker");
    return t("profile.roles.customer");
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 text-[#249B73] rounded-lg flex items-center justify-center">
                <User size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {getRoleDisplay(user.role, user.isWorker)}
                </p>
                <p className="text-gray-500 text-sm">
                  {t("profile.labels.role")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                <Calendar size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {user.memberSince}
                </p>
                <p className="text-gray-500 text-sm">
                  {t("profile.labels.member_since")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
                <Users size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {user.interests?.length || 0}
                </p>
                <p className="text-gray-500 text-sm">
                  {t("profile.labels.interests_count")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t("profile.personal_info")}</CardTitle>
            <Button
              variant="default"
              onClick={isEditing ? handleCancel : handleEdit}
              className="cursor-pointer flex items-center bg-[#249B73] hover:bg-[#1e8a66] gap-2"
              disabled={loading}
            >
              {!isEditing && <Edit size={16} />}
              {isEditing
                ? t("profile.actions.cancel")
                : t("profile.actions.edit")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="firstName">{t("profile.fields.firstName")}</Label>
              <Input
                id="firstName"
                name="firstName"
                type="text"
                value={formData.firstName}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder={t("profile.placeholders.firstName")}
              />
            </div>

            <div>
              <Label htmlFor="lastName">{t("profile.fields.lastName")}</Label>
              <Input
                id="lastName"
                name="lastName"
                type="text"
                value={formData.lastName}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder={t("profile.placeholders.lastName")}
              />
            </div>

            <div>
              <Label htmlFor="phone">{t("profile.fields.phone")}</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder="+998901234567"
              />
            </div>

            <div>
              <Label htmlFor="email">{t("profile.fields.email")}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                disabled={!isEditing}
                placeholder="email@example.com"
              />
            </div>

            <div>
              <Label htmlFor="gender">{t("profile.fields.gender")}</Label>
              {isEditing ? (
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className="w-full border rounded-md p-2"
                >
                  <option value="">Jinsni tanlang</option>
                  <option value="other">{t("profile.gender.other")}</option>
                  <option value="male">{t("profile.gender.male")}</option>
                  <option value="female">{t("profile.gender.female")}</option>
                </select>
              ) : (
                <Input value={getGenderDisplay(user.gender)} disabled />
              )}
            </div>

            <div>
              <Label htmlFor="memberSince">
                {t("profile.labels.member_since")}
              </Label>
              <Input
                id="memberSince"
                type="text"
                value={user.memberSince}
                disabled
              />
            </div>

            <div>
              <Label htmlFor="role">{t("profile.labels.role")}</Label>
              <Input
                id="role"
                type="text"
                value={getRoleDisplay(user.role, user.isWorker)}
                disabled
              />
            </div>
          </div>

          {isEditing && (
            <div className="flex gap-3 mt-6">
              <Button
                onClick={handleSave}
                disabled={loading}
                className="bg-[#249B73] hover:bg-[#1e8a66]"
              >
                {loading
                  ? t("profile.actions.saving")
                  : t("profile.actions.save")}
              </Button>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={loading}
              >
                {t("profile.actions.cancel")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileTab;
