<template>
  <div>
    <p>{{ $t("Settings.UploadProfilePicture.privacyDisclaimer") }}</p>
    <FileUpload
      class="SettingsButton"
      :chooseLabel="$t('Settings.UploadProfilePicture.ChooseFile')"
      mode="basic"
      name="PictureUpload"
      accept="image/*"
      :auto="true"
      :customUpload="true"
      :maxFileSize="8000000"
      @uploader="startCropper($event)"
    />
    <Button
      class="SettingsButton"
      type="button"
      icon="pi pi-trash"
      :label="$t('Settings.UploadProfilePicture.DeletePicture')"
      @click="deleteImage()"
    />
  </div>
  <Dialog
    v-model:visible="cropperDialog"
    :header="$t('Settings.UploadProfilePicture.Modal.header')"
    :modal="true"
    :closeOnEscape="true"
    :dismissableMask="true"
  >
    <div class="cropper">
      <VueCropper
        ref="cropperRef"
        class="cropperImage"
        :src="uploadFile?.objectURL"
        alt="Source Image"
        :aspectRatio="1"
      />
      <div class="cropperControls">
        <Button
          :label="$t('Settings.UploadProfilePicture.Modal.reset')"
          class="p-button-secondary p-button-text"
          @click="reset"
        />
        <Button icon="pi pi-undo" class="p-button-secondary p-button-text" @click="rotate(-90)" />
        <Button
          icon="pi pi-undo"
          class="flipped p-button-secondary p-button-text"
          @click="rotate(90)"
        />
        <Button
          icon="pi pi-upload"
          :label="$t('Settings.UploadProfilePicture.Modal.submit')"
          class="p-button-secondary p-button-text"
          @click="submit"
        />
      </div>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import axios from 'axios';
import VueCropper, { VueCropperMethods } from 'vue-cropperjs';
import 'cropperjs/dist/cropper.css';
import FileUpload from 'primevue/fileupload';
import { deleteProfilePic, requestProfilePic } from '../../services/useProfilePicture';
import { Service } from '@/generatedClient/index';
import { ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import { i18n } from '@/services/i18n';
import { user } from '@/services/useUser';

const toast = useToast();
const emit = defineEmits(['settingoperationdone'])

const cropperDialog = ref(false)
interface customFile extends File { objectURL?: string }
const uploadFile = ref<customFile | null>(null)
const cropperRef = ref<VueCropperMethods | null>(null);

const startCropper = (event: { file: File, files: File[] }) => {
  cropperDialog.value = true;
  uploadFile.value = event.files[0];
  event.files.splice(0, event.files.length);
}

const reset = () => {
  cropperRef.value?.reset();
}

const rotate = (deg: number) => {
  cropperRef.value?.rotate(deg);
}

const submit = async () => {
  cropperRef.value?.getCroppedCanvas().toBlob(
    async (blob) => {
      const jwtToken = user.token
      const myFormData = new FormData();
      myFormData.append('profilePic', blob ?? '');
      try {
        await axios.post('/gameApi/uploadProfilePicture', myFormData, {
          headers: {
            Authorization: 'Bearer ' + jwtToken,
            'Content-Type': 'multipart/form-data',
          },
        });
        deleteProfilePic(user.username ?? '');
        requestProfilePic(user.username ?? '');
        toast.add({
          severity: 'success',
          summary: i18n.global.t(
            'Settings.UploadProfilePicture.toastSummarySuccessUpload'
          ),
          detail: i18n.global.t('Settings.UploadProfilePicture.successMsgUpload'),
          life: 2000,
        });
        emit('settingoperationdone');
      } catch (err) {
        console.log(err);
        toast.add({
          severity: 'error',
          summary: i18n.global.t(
            'Settings.UploadProfilePicture.toastSummaryFailureUpload'
          ),
          detail: i18n.global.t('Settings.UploadProfilePicture.errorMsgUpload'),
          life: 2000,
        });
      }
    },
    'image/jpeg',
    0.9
  );
  cropperDialog.value = false;
  uploadFile.value = null;
}

const deleteImage = async () => {
  try {
    await Service.deleteProfilePicture()
    deleteProfilePic(user.username ?? '');
    requestProfilePic(user.username ?? '');
    toast.add({
      severity: 'success',
      summary: i18n.global.t('Settings.UploadProfilePicture.toastSummarySuccessDelete'),
      detail: i18n.global.t('Settings.UploadProfilePicture.successMsgDelete'),
      life: 2000,
    });
    emit('settingoperationdone');
  } catch (err) {
    console.log(err);
    toast.add({
      severity: 'error',
      summary: i18n.global.t('Settings.UploadProfilePicture.toastSummaryFailureDelete'),
      detail: i18n.global.t('Settings.UploadProfilePicture.errorMsgDelete'),
      life: 2000,
    });
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
