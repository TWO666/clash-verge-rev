import {
  Box,
  Button,
  List,
  ListItem,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material'
import { useLockFn } from 'ahooks'
import type { Ref } from 'react'
import { useImperativeHandle, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { BaseDialog, TooltipIcon, DialogRef } from '@/components/base'
import { useClash } from '@/hooks/use-clash'
import { enhanceProfiles } from '@/services/cmds'
import { mutate } from '@/services/mutate'
import { showNotice } from '@/services/notice-service'
import getSystem from '@/utils/get-system'

import { DnsModeSwitch } from './dns-mode-switch'
import { StackModeSwitch } from './stack-mode-switch'

const OS = getSystem()

export function TunViewer({ ref }: { ref?: Ref<DialogRef> }) {
  const { t } = useTranslation()

  const { clash, mutateClash, patchClash } = useClash()

  const [open, setOpen] = useState(false)
  const [values, setValues] = useState({
    stack: 'mips',
    device: OS === 'macos' ? 'utun1024' : 'Mihomo',
    dnsMode: '',
  })

  useImperativeHandle(ref, () => ({
    open: () => {
      setOpen(true)
      setValues({
        stack: clash?.tun.stack ?? 'mips',
        device: clash?.tun.device ?? (OS === 'macos' ? 'utun1024' : 'Mihomo'),
        dnsMode: clash?.tun['dns-mode'] ?? '',
      })
    },
    close: () => setOpen(false),
  }))

  const onSave = useLockFn(async () => {
    try {
      const tun: IConfigData['tun'] = {
        stack: values.stack,
        device:
          values.device === ''
            ? OS === 'macos'
              ? 'utun1024'
              : 'Mihomo'
            : values.device,
        'auto-route': true,
        'route-exclude-address': [],
        ...(OS === 'linux' ? { 'auto-redirect': false } : {}),
        'auto-detect-interface': true,
        'dns-hijack': ['any:53'],
        'dns-mode': values.dnsMode,
        'strict-route': false,
        mtu: 1500,
      }
      await patchClash({ tun })
      await mutateClash(
        (old) => ({
          ...old!,
          tun,
        }),
        false,
      )
      setOpen(false)
      showNotice.success('settings.modals.tun.messages.applied')
      void mutate(() => enhanceProfiles(), {
        id: 'enhance-profiles',
        errorNotice: false,
      }).catch((err: any) => {
        showNotice.error(err)
      })
    } catch (err: any) {
      showNotice.error(err)
    }
  })

  return (
    <BaseDialog
      open={open}
      title={
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
          <Typography variant="h6">{t('settings.modals.tun.title')}</Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={async () => {
              const tun: IConfigData['tun'] = {
                stack: 'mips',
                device: OS === 'macos' ? 'utun1024' : 'Mihomo',
                'auto-route': true,
                ...(OS === 'linux'
                  ? {
                      'auto-redirect': false,
                    }
                  : {}),
                'auto-detect-interface': true,
                'dns-hijack': ['any:53'],
                'route-exclude-address': [],
                'dns-mode': '',
                'strict-route': false,
                mtu: 1500,
              }
              setValues({
                stack: 'mips',
                device: OS === 'macos' ? 'utun1024' : 'Mihomo',
                dnsMode: '',
              })
              await patchClash({ tun })
              await mutateClash(
                (old) => ({
                  ...old!,
                  tun,
                }),
                false,
              )
            }}
          >
            {t('shared.actions.resetToDefault')}
          </Button>
        </Box>
      }
      contentSx={{ width: 450 }}
      okBtn={t('shared.actions.save')}
      cancelBtn={t('shared.actions.cancel')}
      onClose={() => setOpen(false)}
      onCancel={() => setOpen(false)}
      onOk={onSave}
    >
      <List>
        <ListItem sx={{ padding: '5px 2px' }}>
          <ListItemText primary={t('settings.modals.tun.fields.stack')} />
          <StackModeSwitch
            value={values.stack}
            onChange={(value) => {
              setValues((v) => ({
                ...v,
                stack: value,
              }))
            }}
          />
        </ListItem>

        <ListItem sx={{ padding: '5px 2px' }}>
          <ListItemText
            primary={t('settings.modals.tun.fields.dnsMode')}
            sx={{ maxWidth: 'fit-content' }}
          />
          <TooltipIcon
            title={t('settings.modals.tun.tooltips.dnsMode')}
            sx={{ opacity: 0.7 }}
          />
          <Box sx={{ marginLeft: 'auto' }}>
            <DnsModeSwitch
              value={values.dnsMode}
              onChange={(value) => {
                setValues((v) => ({ ...v, dnsMode: value }))
              }}
            />
          </Box>
        </ListItem>

        <ListItem sx={{ padding: '5px 2px' }}>
          <ListItemText primary={t('settings.modals.tun.fields.device')} />
          <TextField
            autoComplete="new-password"
            size="small"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            sx={{ width: 250 }}
            value={values.device}
            placeholder="Mihomo"
            onChange={(e) =>
              setValues((v) => ({ ...v, device: e.target.value }))
            }
          />
        </ListItem>
      </List>
    </BaseDialog>
  )
}
