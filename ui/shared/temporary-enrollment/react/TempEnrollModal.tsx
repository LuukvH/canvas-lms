/*
 * Copyright (C) 2023 - present Instructure, Inc.
 *
 * This file is part of Canvas.
 *
 * Canvas is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, version 3 of the License.
 *
 * Canvas is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

import React, {
  cloneElement,
  MouseEvent,
  MouseEventHandler,
  ReactElement,
  useEffect,
  useState,
} from 'react'
import {useScope as useI18nScope} from '@canvas/i18n'
import {Modal} from '@instructure/ui-modal'
import {Button} from '@instructure/ui-buttons'
import {Heading} from '@instructure/ui-heading'
import {TempEnrollSearch} from './TempEnrollSearch'
import {TempEnrollEdit} from './TempEnrollEdit'
import {TempEnrollAssign} from './TempEnrollAssign'
import {Flex} from '@instructure/ui-flex'
import {Enrollment, EnrollmentType, MODULE_NAME, TempEnrollPermissions, User} from './types'
import {showFlashSuccess} from '@canvas/alerts/react/FlashAlert'
import {createAnalyticPropsGenerator} from './util/analytics'

const I18n = useI18nScope('temporary_enrollment')

// initialize analytics props
const analyticProps = createAnalyticPropsGenerator(MODULE_NAME)

interface Props {
  readonly title: string | ((enrollmentType: EnrollmentType, name: string) => string)
  readonly enrollmentType: EnrollmentType
  readonly children: ReactElement
  readonly user: {
    id: string
    name: string
    avatar_url?: string
  }
  readonly canReadSIS?: boolean
  readonly permissions: {
    teacher: boolean
    ta: boolean
    student: boolean
    observer: boolean
    designer: boolean
  }
  readonly accountId: string
  readonly roles: {id: string; label: string; base_role_name: string}[]
  readonly onOpen?: () => void
  readonly onClose?: () => void
  readonly defaultOpen?: boolean
  readonly isOpen?: boolean
  readonly tempEnrollments?: Enrollment[]
  readonly isEditMode: boolean
  readonly onToggleEditMode?: (mode?: boolean) => void
  // TODO add onDeleteEnrollment prop to parent component and update user list
  readonly onDeleteEnrollment?: (enrollmentId: number) => void
  readonly tempEnrollPermissions: TempEnrollPermissions
}

export function TempEnrollModal(props: Props) {
  const [open, setOpen] = useState(props.defaultOpen || false)
  const [page, setPage] = useState(0)
  const [enrollment, setEnrollment] = useState<User | null>(null)
  const [enrollmentData, setEnrollmentData] = useState<Enrollment[]>([])
  const [isViewingAssignFromEdit, setIsViewingAssignFromEdit] = useState(false)

  const dynamicTitle =
    typeof props.title === 'function'
      ? props.title(props.enrollmentType, props.user.name)
      : props.title

  useEffect(() => {
    if (props.tempEnrollments) {
      setEnrollmentData(props.tempEnrollments)
    }
  }, [props.tempEnrollments])

  function resetState(pg: number = 0) {
    setPage(pg)

    if (props.isEditMode && props.onToggleEditMode) {
      props.onToggleEditMode(false)
    }
  }

  const handleEnrollmentSubmission = (isSuccess: boolean) => {
    if (isSuccess) {
      resetState()
      setOpen(false)
      showFlashSuccess(I18n.t('Temporary enrollment was successfully created.'))()
    } else {
      setPage(2)
    }
  }

  const handleEnrollmentDeletion = (enrollmentId: number) => {
    // remove/update enrollment from internal state
    setEnrollmentData(prevData => prevData.filter(item => item.id !== enrollmentId))

    // notify parent of deletion
    if (props.onDeleteEnrollment) {
      props.onDeleteEnrollment(enrollmentId)
    }
  }

  const handleOpenModal = () => {
    if (props.isOpen !== undefined) {
      props.onOpen && props.onOpen()
    } else if (!open) {
      setOpen(true)
    }
  }

  const handleCloseModal = () => {
    if (props.isOpen !== undefined) {
      props.onClose && props.onClose()
    } else if (open) {
      setOpen(false)
      resetState()
    }
  }

  const handleSearchFailure = () => {
    resetState()
  }

  const handleSetEnrollmentFromSearch = (e: any) => {
    setEnrollment(e)
  }

  const handleCancel = () => {
    setOpen(false)
    resetState()
  }

  const handleGoBack = () => {
    setPage((p: number) => p - 1)
  }

  const handleResetToBeginning = () => {
    resetState()
    setPage((p: number) => p - 1)
  }

  const handlePageTransition = () => {
    setPage(p => p + 1)
  }

  const handleOpenForNewEnrollment = () => {
    resetState()
    setOpen(true)
  }

  const isSubmissionPage = () => {
    return page === 3
  }

  const handleGoToAssignPageWithEnrollment = (chosenEnrollment: any) => {
    setEnrollment(chosenEnrollment)
    resetState(2)
    setIsViewingAssignFromEdit(true)
  }

  const handleChildClick =
    (originalOnClick?: MouseEventHandler<HTMLElement>) => (event: MouseEvent<HTMLElement>) => {
      // stop the event from propagating up
      event.stopPropagation()

      // trigger the modal open function
      handleOpenModal()

      // call the original onClick (if it exists)
      if (typeof originalOnClick === 'function') {
        originalOnClick(event)
      }
    }

  const renderScreen = () => {
    if (props.isEditMode) {
      // edit enrollments screen
      return (
        <TempEnrollEdit
          user={props.user}
          enrollments={enrollmentData}
          onAddNew={handleOpenForNewEnrollment}
          onEdit={handleGoToAssignPageWithEnrollment}
          onDelete={handleEnrollmentDeletion}
          contextType={props.enrollmentType}
          tempEnrollPermissions={props.tempEnrollPermissions}
        />
      )
    } else {
      if (page >= 2) {
        // assign screen
        return (
          <TempEnrollAssign
            user={props.user}
            enrollment={enrollment}
            roles={props.roles}
            goBack={handleGoBack}
            permissions={props.permissions}
            doSubmit={isSubmissionPage}
            setEnrollmentStatus={handleEnrollmentSubmission}
            isInAssignEditMode={isViewingAssignFromEdit}
            contextType={props.enrollmentType}
          />
        )
      }

      // search screen
      return (
        <TempEnrollSearch
          accountId={props.accountId}
          canReadSIS={props.canReadSIS}
          user={props.user}
          page={page}
          searchFail={handleSearchFailure}
          searchSuccess={handleSetEnrollmentFromSearch}
          foundEnroll={enrollment !== null ? enrollment : undefined}
        />
      )
    }
  }

  const renderButtons = () => {
    if (props.isEditMode) {
      return (
        <Flex.Item margin="0 small 0 0">
          <Button onClick={handleCancel} {...analyticProps('Done')}>
            {I18n.t('Done')}
          </Button>
        </Flex.Item>
      )
    } else {
      return [
        <Flex.Item key="cancel" margin="0 small 0 0">
          <Button onClick={handleCancel} {...analyticProps('Cancel')}>
            {I18n.t('Cancel')}
          </Button>
        </Flex.Item>,

        page === 1 && (
          <Flex.Item key="startOver" margin="0 small 0 0">
            <Button onClick={handleResetToBeginning} {...analyticProps('StartOver')}>
              {I18n.t('Start Over')}
            </Button>
          </Flex.Item>
        ),

        !props.isEditMode && (
          <Flex.Item key="nextOrSubmit" margin="0 small 0 0">
            <Button
              color="primary"
              onClick={handlePageTransition}
              {...analyticProps(page === 2 ? 'Submit' : 'Next')}
            >
              {page === 2 ? I18n.t('Submit') : I18n.t('Next')}
            </Button>
          </Flex.Item>
        ),
      ]
    }
  }

  return (
    <>
      <Modal
        overflow="scroll"
        open={props.isOpen ?? open}
        onDismiss={handleCloseModal}
        size="large"
        label={I18n.t('Create a Temporary Enrollment')}
        shouldCloseOnDocumentClick={true}
        themeOverride={{smallMaxWidth: '30em'}}
      >
        <Modal.Header>
          <Heading tabIndex={-1} level="h2">
            {dynamicTitle}
          </Heading>
        </Modal.Header>

        <Modal.Body>{renderScreen()}</Modal.Body>

        <Modal.Footer>
          <Flex>{renderButtons()}</Flex>
        </Modal.Footer>
      </Modal>

      {cloneElement(props.children, {
        onClick: handleChildClick(props.children.props.onClick),
      })}
    </>
  )
}
