<template>
  <div v-if="!settingsStore.isBlockedByModeration">
    <p>{{ t('Settings.UploadProfilePicture.privacyDisclaimer') }}</p>
    <div class="SettingsButton">
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
    </div>
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
    :pt="{ transition: { onAfterEnter: initCropper } }"
    @after-hide="destroyCropper"
  >
    <div class="cropper">
      <div class="cropperImage">
        <img
          ref="imageRef"
          class="cropperSource"
          :src="uploadFile?.objectURL"
          alt="Source Image"
        />
      </div>
      <div class="cropperControls">
        <Button
          :label="t('Settings.UploadProfilePicture.Modal.reset')"
          text
          severity="secondary"
          @click="reset"
        />
        <Button
          icon="pi pi-undo"
          text
          severity="secondary"
          @click="rotate(-90)"
        />
        <Button
          icon="pi pi-undo"
          class="flipped"
          text
          severity="secondary"
          @click="rotate(90)"
        />
        <Button
          icon="pi pi-upload"
          :label="t('Settings.UploadProfilePicture.Modal.submit')"
          text
          severity="secondary"
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
import Cropper, { type CropperHandle } from 'cropperjs'
import FileUpload from 'primevue/fileupload'
import { deleteProfilePic, requestProfilePic } from '../../services/useProfilePicture'
import { DefaultService as Service } from '@/generatedClient/index.ts'
import { onBeforeUnmount, ref } from 'vue'
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
const imageRef = ref<HTMLImageElement | null>(null)
let cropper: Cropper | null = null
let limitImage = true

interface Rect {
  x: number
  y: number
  width: number
  height: number
}

// The default template of cropperjs with a square selection over 80% of the image, styled like cropperjs 1
const cropperTemplate = [
  '<cropper-canvas background>',
  '<cropper-image scalable translatable></cropper-image>',
  '<cropper-shade theme-color="rgba(0, 0, 0, 0.5)"></cropper-shade>',
  '<cropper-handle action="select" plain></cropper-handle>',
  '<cropper-selection initial-coverage="0.8" aspect-ratio="1" movable resizable outlined>',
  '<cropper-grid role="grid" bordered covered></cropper-grid>',
  '<cropper-crosshair centered></cropper-crosshair>',
  '<cropper-handle action="move" theme-color="rgba(255, 255, 255, 0.1)"></cropper-handle>',
  ...['n', 'e', 's', 'w', 'ne', 'nw', 'se', 'sw'].map((edge) => `<cropper-handle action="${edge}-resize"></cropper-handle>`),
  '</cropper-selection>',
  '</cropper-canvas>',
].join('')

const imageRect = (): Rect | null => {
  const canvas = cropper?.getCropperCanvas()?.getBoundingClientRect()
  const image = cropper?.getCropperImage()?.getBoundingClientRect()
  return canvas && image ? { x: image.x - canvas.x, y: image.y - canvas.y, width: image.width, height: image.height } : null
}

const contains = (outer: Rect, inner: Rect) =>
  inner.x >= outer.x - 0.01 && inner.y >= outer.y - 0.01 && inner.x + inner.width <= outer.x + outer.width + 0.01 && inner.y + inner.height <= outer.y + outer.height + 0.01

// Moving slides the selection along the image border, resizing stops at it (like viewMode 1 of cropperjs 1)
const fitIntoImage = (next: Rect, current: Rect, image: Rect): Rect => {
  const moved = next.width === current.width
  const axes = [
    [next.x, current.x, image.x, image.width],
    [next.y, current.y, image.y, image.height],
  ].map(([start, currentStart, imageStart, imageLength]) => ({
    start,
    end: start + next.width,
    min: Math.ceil(imageStart),
    max: Math.floor(imageStart + imageLength),
    keepStart: !moved && Math.abs(start - currentStart) <= 1,
    keepEnd: !moved && Math.abs(start + next.width - (currentStart + current.width)) <= 1,
  }))
  const size = Math.min(next.width, ...axes.map((axis) => (axis.keepStart ? axis.max - axis.start : axis.keepEnd ? axis.end - axis.min : axis.max - axis.min)))
  const [x, y] = axes.map((axis) => (axis.keepStart ? axis.start : axis.keepEnd ? axis.end - size : Math.min(Math.max(axis.start, axis.min), axis.max - size)))
  return { x, y, width: size, height: size }
}

const keepSelectionInImage = (event: Event) => {
  const next = (event as CustomEvent<Rect>).detail
  const selection = cropper?.getCropperSelection()
  const image = imageRect()
  if (!selection || !image || next.width === 0 || contains(image, next)) return
  event.preventDefault()
  const fitted = fitIntoImage(next, selection, image)
  if (fitted.width > 0 && contains(image, fitted)) selection.$change(fitted.x, fitted.y, fitted.width, fitted.height)
}

const keepImageUnderSelection = (event: Event) => {
  const selection = cropper?.getCropperSelection()
  if (!limitImage || !selection || selection.width === 0) return
  if (!contains((event as CustomEvent<Rect>).detail, selection)) event.preventDefault()
}

const fitSelection = () => {
  const selection = cropper?.getCropperSelection()
  const image = imageRect()
  if (!selection || !image) return
  const fitted = fitIntoImage(selection, selection, image)
  selection.$change(fitted.x, fitted.y, fitted.width, fitted.height)
}

const withoutImageLimit = (action: () => void) => {
  limitImage = false
  try {
    action()
  } finally {
    limitImage = true
  }
}

// Created after the enter animation of the dialog, as cropperjs measures the (until then scaled) dialog
const initCropper = () => {
  if (!imageRef.value) return
  cropper = new Cropper(imageRef.value, { template: cropperTemplate })
  cropper.getCropperSelection()?.addEventListener('change', keepSelectionInImage)
  cropper.getCropperImage()?.addEventListener('change', keepImageUnderSelection)
  // A double click on the background switches between drawing a selection and moving the image
  const background = cropper.getCropperCanvas()?.querySelector<CropperHandle>('cropper-handle[plain]')
  cropper.getCropperCanvas()?.addEventListener('dblclick', (event) => {
    if (background && event.target === background) background.action = background.action === 'select' ? 'move' : 'select'
  })
}

const destroyCropper = () => {
  cropper?.destroy()
  cropper = null
}
onBeforeUnmount(destroyCropper)

const startCropper = (event: any) => {
  cropperDialog.value = true
  uploadFile.value = event.files[0]
  event.files.splice(0, event.files.length)
}

const reset = () => {
  const image = cropper?.getCropperImage()
  withoutImageLimit(() => image?.$resetTransform().$center('contain'))
  cropper?.getCropperSelection()?.$reset()
}

const rotate = (deg: number) => {
  const image = cropper?.getCropperImage()
  if (!image) return
  // Only rotatable here, otherwise two-finger gestures would rotate the image freely
  image.rotatable = true
  withoutImageLimit(() => image.$rotate(`${deg}deg`))
  image.rotatable = false
  fitSelection()
}

// Cropped in the resolution of the image itself, as cropperjs 1 did
const getCroppedCanvas = async () => {
  const image = cropper?.getCropperImage()
  const selection = cropper?.getCropperSelection()
  if (!image || !selection) return null
  const [a, b] = image.$getTransform()
  return selection.$toCanvas({ width: Math.round(selection.width / Math.hypot(a, b)) })
}

const submit = async () => {
  const canvas = await getCroppedCanvas()
  canvas?.toBlob(
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
  margin: 5px auto;
  width: fit-content;
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

.cropperImage :deep(cropper-canvas) {
  height: 100%;
}

/* Shown like the cropper shows it until the cropper replaces it after the dialog animation */
.cropperSource {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
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
