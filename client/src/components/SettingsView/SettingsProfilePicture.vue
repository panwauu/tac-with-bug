<template>
  <div v-if="!settingsStore.isBlockedByModeration">
    <p>{{ t('Settings.UploadProfilePicture.privacyDisclaimer') }}</p>
    <FileUpload
      class="SettingsButton"
      :choose-label="t('Settings.UploadProfilePicture.ChooseFile')"
      mode="basic"
      name="PictureUpload"
      accept="image/*"
      :auto="true"
      :custom-upload="true"
      :max-file-size="8000000"
      @uploader="startCropper($event)"
    />
    <Button
      class="SettingsButton"
      type="button"
      icon="pi pi-trash"
      :label="t('Settings.UploadProfilePicture.DeletePicture')"
      @click="deleteImage()"
    />
  </div>
  <div v-else>
    <BlockedByModerationMessage :blocked-by-moderation-until="settingsStore.blockedByModerationUntil ?? ''" />
  </div>
  <Dialog
    v-model:visible="cropperDialog"
    :header="t('Settings.UploadProfilePicture.Modal.header')"
    :modal="true"
    :close-on-escape="true"
    :dismissable-mask="true"
  >
    <div class="cropper">
      <VueCropper
        ref="cropperRef"
        class="cropperImage"
        :src="uploadFile?.objectURL"
        alt="Source Image"
        :aspect-ratio="1"
      />
      <div class="cropperControls">
        <Button
          :label="t('Settings.UploadProfilePicture.Modal.reset')"
          class="p-button-secondary p-button-text"
          @click="reset"
        />
        <Button
          icon="pi pi-undo"
          class="p-button-secondary p-button-text"
          @click="rotate(-90)"
        />
        <Button
          icon="pi pi-undo"
          class="flipped p-button-secondary p-button-text"
          @click="rotate(90)"
        />
        <Button
          icon="pi pi-upload"
          :label="t('Settings.UploadProfilePicture.Modal.submit')"
          class="p-button-secondary p-button-text"
          @click="submit"
        />
      </div>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import VueCropper, { type VueCropperMethods } from 'vue-cropperjs'
import 'cropperjs/dist/cropper.css'
import FileUpload from 'primevue/fileupload'
import { deleteProfilePic, requestProfilePic } from '../../services/useProfilePicture'
import { DefaultService as Service } from '@/generatedClient/index'
import { ref } from 'vue'
import { useToast } from 'primevue/usetoast'
import { user } from '@/services/useUser'
import { useSettingsStore } from '@/store/settings'
import BlockedByModerationMessage from '../BlockedByModerationMessage.vue'

const settingsStore = useSettingsStore()
const toast = useToast()
const emit = defineEmits<{ settingoperationdone: [] }>()

const cropperDialog = ref(false)
interface CustomFile extends File {
  objectURL?: string
}
const uploadFile = ref<CustomFile | null>(null)
const cropperRef = ref<VueCropperMethods | null>(null)

const startCropper = (event: any) => {
  cropperDialog.value = true
  uploadFile.value = event.files[0]
  event.files.splice(0, event.files.length)
}

const reset = () => {
  cropperRef.value?.reset()
}

const rotate = (deg: number) => {
  cropperRef.value?.rotate(deg)
}

const submit = async () => {
  cropperRef.value?.getCroppedCanvas().toBlob(
    async (blob) => {
      const jwtToken = user.token
      const myFormData = new FormData()
      myFormData.append('profilePic', blob ?? '')
      const postRes = await fetch('/gameApi/uploadProfilePicture', {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwtToken}` },
        body: myFormData,
      })

      if (postRes.status === 204) {
        deleteProfilePic(user.username ?? '')
        requestProfilePic(user.username ?? '')
        toast.add({
          severity: 'success',
          summary: t('Settings.UploadProfilePicture.toastSummarySuccessUpload'),
          detail: t('Settings.UploadProfilePicture.successMsgUpload'),
          life: 2000,
        })
        emit('settingoperationdone')
      } else {
        toast.add({
          severity: 'error',
          summary: t('Settings.UploadProfilePicture.toastSummaryFailureUpload'),
          detail: t('Settings.UploadProfilePicture.errorMsgUpload'),
          life: 2000,
        })
      }
    },
    'image/jpeg',
    0.9
  )
  cropperDialog.value = false
  uploadFile.value = null
}

const deleteImage = async () => {
  try {
    await Service.deleteProfilePicture()
    deleteProfilePic(user.username ?? '')
    requestProfilePic(user.username ?? '')
    toast.add({
      severity: 'success',
      summary: t('Settings.UploadProfilePicture.toastSummarySuccessDelete'),
      detail: t('Settings.UploadProfilePicture.successMsgDelete'),
      life: 2000,
    })
    emit('settingoperationdone')
  } catch (err) {
    console.log(err)
    toast.add({
      severity: 'error',
      summary: t('Settings.UploadProfilePicture.toastSummaryFailureDelete'),
      detail: t('Settings.UploadProfilePicture.errorMsgDelete'),
      life: 2000,
    })
  }
}
</script>

<style scoped>
.SettingsButton {
  margin: 5px;
}

.cropper {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.cropperImage {
  width: 65vmin;
  height: 65vmin;
}

.flipped {
  transform: scaleX(-1);
}

.cropperControls {
  display: flex;
  flex-direction: row;
  justify-content: center;
}
</style>
